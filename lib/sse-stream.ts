/**
 * Server-Sent Events (SSE) streaming utilities
 */

export interface SSEEvent {
  event: string;
  data: any;
}

/**
 * Parse SSE stream from ReadableStream
 */
export async function* parseSSEStream(
  stream: ReadableStream
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      let currentEvent: string | null = null;
      let currentData: string | null = null;

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          currentData = line.slice(5).trim();
        } else if (line === "" && currentEvent && currentData) {
          // End of event
          try {
            const data = JSON.parse(currentData);
            yield {
              event: currentEvent,
              data,
            };
          } catch (e) {
            console.error("Failed to parse SSE data:", currentData, e);
          }
          currentEvent = null;
          currentData = null;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse SSE events into a more usable format for the UI
 */
export interface StreamMessage {
  type: "message" | "tool_use" | "result" | "error" | "end" | "metadata";
  data: any;
}

export async function* transformSSEToMessages(
  sseStream: AsyncGenerator<SSEEvent>
): AsyncGenerator<StreamMessage> {
  for await (const event of sseStream) {
    switch (event.event) {
      case "metadata":
        yield {
          type: "metadata",
          data: event.data,
        };
        break;

      case "values":
        // This contains message chunks
        if (event.data.messages) {
          for (const message of event.data.messages) {
            yield {
              type: "message",
              data: message,
            };
          }
        }
        break;

      case "tool_use":
        yield {
          type: "tool_use",
          data: event.data.tool_use || event.data,
        };
        break;

      case "result":
        yield {
          type: "result",
          data: event.data,
        };
        break;

      case "error":
        yield {
          type: "error",
          data: event.data,
        };
        break;

      case "end":
        yield {
          type: "end",
          data: event.data,
        };
        break;

      default:
        console.warn("Unknown SSE event type:", event.event);
    }
  }
}
