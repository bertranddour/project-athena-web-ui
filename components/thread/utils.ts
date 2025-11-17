import type { Message } from "@/lib/api/client";

/**
 * Extracts a string summary from a message's content.
 *
 * Athena Engine message format:
 * - content is a Record<string, any> where the structure depends on content_type
 * - For text messages: { text: "..." }
 * - For tool messages: { tool_name: "...", input: {...}, output: {...} }
 * - For image messages: { url: "...", media_type: "..." }
 */
export function getContentString(content: Message["content"]): string {
  // Handle null/undefined
  if (!content) return "";

  // If it's already a string, return it
  if (typeof content === "string") return content;

  // If it's an object with a "text" property (Athena text message)
  if (typeof content === "object" && "text" in content) {
    return String(content.text);
  }

  // If it's an array (legacy format)
  if (Array.isArray(content)) {
    const texts = content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text);
    return texts.join(" ");
  }

  // For tool use/results, return a placeholder
  if ("tool_name" in content) {
    return `[Tool: ${content.tool_name}]`;
  }

  // Fallback: return empty string
  return "";
}
