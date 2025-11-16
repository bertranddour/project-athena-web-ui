import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useState, FormEvent } from "react";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { ArrowDown, LoaderCircle, SquarePen, XIcon, Plus } from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { toast } from "sonner";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useFileUpload } from "@/hooks/use-file-upload";
import { ContentBlocksPreview } from "./ContentBlocksPreview";
import {
  useArtifactOpen,
  ArtifactContent,
  ArtifactTitle,
  useArtifactContext,
} from "./artifact";

function StickyToBottomContent(props: {
  content: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div
        ref={context.contentRef}
        className={props.contentClassName}
      >
        {props.content}
      </div>
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-12 rounded-full border border-zinc-300/60 bg-white/80 shadow-wave-button",
        props.className,
      )}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="h-5 w-5 text-amber-400" />
      <span className="sr-only">Scroll to bottom</span>
    </Button>
  );
}

export function Thread() {
  const [artifactContext, setArtifactContext] = useArtifactContext();
  const [artifactOpen, closeArtifact] = useArtifactOpen();

  const [threadId, _setThreadId] = useQueryState("threadId");
  const [hideToolCalls, setHideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );
  const [input, setInput] = useState("");
  const {
    contentBlocks,
    setContentBlocks,
    handleFileUpload,
    dropRef,
    removeBlock,
    resetBlocks: _resetBlocks,
    dragOver,
    handlePaste,
  } = useFileUpload();
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);

  const setThreadId = (id: string | null) => {
    _setThreadId(id);

    // close artifact and reset artifact context
    closeArtifact();
    setArtifactContext({});
  };

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        // Message has already been logged. do not modify ref, return early.
        return;
      }

      // Message is defined, and it has not been logged yet. Save it, and send the error
      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  // TODO: this should be part of the useStream hook
  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim().length === 0 && contentBlocks.length === 0) || isLoading)
      return;
    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: [
        ...(input.trim().length > 0 ? [{ type: "text", text: input }] : []),
        ...contentBlocks,
      ] as Message["content"],
    };

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);

    const context =
      Object.keys(artifactContext).length > 0 ? artifactContext : undefined;

    stream.submit(
      { messages: [...toolMessages, newHumanMessage], context },
      {
        streamMode: ["values"],
        streamSubgraphs: true,
        streamResumable: true,
        optimisticValues: (prev) => ({
          ...prev,
          context,
          messages: [
            ...(prev.messages ?? []),
            ...toolMessages,
            newHumanMessage,
          ],
        }),
      },
    );

    setInput("");
    setContentBlocks([]);
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    // Do this so the loading state is correct
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
      streamSubgraphs: true,
      streamResumable: true,
    });
  };

  const chatStarted = !!threadId || !!messages.length;
  const hasNoAIOrToolMessages = !messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );
  const threadLabel = threadId ? `#${threadId.slice(0, 8)}` : "Thread new";
  const conversationStatus = chatStarted
    ? "Live session"
    : "Waiting for a prompt";
  const threadStatusText = `${threadLabel.toUpperCase()} • ${conversationStatus.toUpperCase()}`;

  return (
    <div className="min-h-dvh bg-zinc-200 pb-16 pt-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6">
        <header className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              aria-label="Wave Artisans home"
              className="inline-flex items-center"
            >
              <Image
                src="/wave-artisan-logo.svg"
                width={120}
                height={44}
                alt="Wave Artisans"
                className="h-11 w-auto"
                priority
              />
            </Link>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Shape · Balance · Ride
            </p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-zinc-300/60 bg-zinc-200 px-4 py-3">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setThreadId(null)}
                  className="size-12 rounded-full border border-zinc-300/60 bg-white/80 text-zinc-600 shadow-wave-button transition hover:bg-white"
                  aria-label="Start new chat"
                >
                  <SquarePen className="h-5 w-5 text-teal-400" />
                </Button>
                <div className="flex-1 text-center text-xs uppercase tracking-[0.35em] text-zinc-500">
                  {threadStatusText}
                </div>
                <Switch
                  aria-label="Hide tool calls"
                  checked={hideToolCalls ?? false}
                  onChange={(event) => setHideToolCalls(event.target.checked)}
                />
              </div>
            </div>

            <ThreadHistory />
          </div>

          <div className="space-y-6">
            <div
              className={cn(
                "grid gap-6",
                artifactOpen
                  ? "lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]"
                  : "",
              )}
            >
              <div className="rounded-[1.8rem] bg-zinc-200 shadow-wave-embossed">
                <StickToBottom className="relative h-[70vh] max-h-[70vh]">
                  <StickyToBottomContent
                    className="scrollbar-pretty relative h-full overflow-y-auto"
                    contentClassName="mx-auto w-full max-w-3xl space-y-4 px-6 py-8"
                    content={
                      <>
                        {messages
                          .filter(
                            (m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX),
                          )
                          .map((message, index) =>
                            message.type === "human" ? (
                              <HumanMessage
                                key={message.id || `${message.type}-${index}`}
                                message={message}
                                isLoading={isLoading}
                              />
                            ) : (
                              <AssistantMessage
                                key={message.id || `${message.type}-${index}`}
                                message={message}
                                isLoading={isLoading}
                                handleRegenerate={handleRegenerate}
                              />
                            ),
                          )}
                        {hasNoAIOrToolMessages && !!stream.interrupt && (
                          <AssistantMessage
                            key="interrupt-msg"
                            message={undefined}
                            isLoading={isLoading}
                            handleRegenerate={handleRegenerate}
                          />
                        )}
                        {isLoading && !firstTokenReceived && (
                          <AssistantMessageLoading />
                        )}
                      </>
                    }
                  />
                  <div className="pointer-events-none absolute bottom-6 right-6">
                    <div className="pointer-events-auto">
                      <ScrollToBottom />
                    </div>
                  </div>
                </StickToBottom>
              </div>

              {artifactOpen && (
                <div className="rounded-[1.8rem] border border-zinc-300/60 bg-zinc-200 shadow-wave-panel">
                  <div className="flex items-center justify-between border-b border-zinc-300/60 px-5 py-3">
                    <ArtifactTitle className="text-sm font-semibold text-zinc-700" />
                    <button
                      onClick={closeArtifact}
                      className="rounded-full border border-zinc-300/60 p-2 text-zinc-500 shadow-wave-button"
                    >
                      <XIcon className="size-4" />
                      <span className="sr-only">Close artifact</span>
                    </button>
                  </div>
                  <ArtifactContent className="scrollbar-pretty max-h-[70vh] overflow-y-auto p-4 text-sm text-zinc-600" />
                </div>
              )}
            </div>
            <div
              ref={dropRef}
              className={cn(
                "space-y-4",
                dragOver && "rounded-[1.5rem] ring-2 ring-teal-200",
              )}
            >
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
                  <ContentBlocksPreview
                    blocks={contentBlocks}
                    onRemove={removeBlock}
                  />
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.metaKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        const el = e.target as HTMLElement | undefined;
                        const form = el?.closest("form");
                        form?.requestSubmit();
                      }
                    }}
                    placeholder="Type your message or drop artifacts"
                    className="input-embossed min-h-28 w-full rounded-[1.5rem] border-none bg-transparent px-4 py-3 text-sm text-zinc-700 placeholder:text-zinc-500 focus-visible:outline-none"
                  />

                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
                      <Label
                        htmlFor="file-input"
                        className="flex cursor-pointer items-center gap-2"
                      >
                      <Plus className="size-4 text-zinc-500" />
                      Attach PDF or image
                    </Label>
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileUpload}
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      className="hidden"
                    />
                    <div className="ml-auto flex items-center gap-3">
                      {stream.isLoading ? (
                        <Button
                          key="stop"
                          onClick={() => stream.stop()}
                          variant="ghost"
                        >
                          <LoaderCircle className="size-4 animate-spin" />
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={
                            isLoading || (!input.trim() && contentBlocks.length === 0)
                          }
                          className="text-teal-400 disabled:text-zinc-400"
                        >
                          Send
                        </Button>
                      )}
                      </div>
                    </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
