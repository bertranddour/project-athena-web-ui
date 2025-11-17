/**
 * Extracts a string summary from a message's content.
 */
export function getContentString(content: unknown): string {
  // Handle null/undefined
  if (!content) return "";

  // If it's already a string, return it
  if (typeof content === "string") return content;

  // If it's an object with a "text" property (Athena text message)
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text: unknown }).text ?? "");
  }

  // If it's an array (legacy format)
  if (Array.isArray(content)) {
    const texts = content
      .filter((c): c is { type: "text"; text: string } => c?.type === "text")
      .map((c) => c.text);
    return texts.join(" ");
  }

  // For tool use/results, return a placeholder
  if (content && typeof content === "object" && "tool_name" in content) {
    const toolName = (content as { tool_name?: string }).tool_name ?? "tool";
    return `[Tool: ${toolName}]`;
  }

  // Fallback: return empty string
  return "";
}
