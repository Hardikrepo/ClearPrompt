/**
 * Rough token estimate (~4 characters per token, the standard ballpark for
 * English text used by OpenAI's own docs). Exact counts vary per model's
 * actual tokenizer, so this is deliberately labeled "~" in the UI rather
 * than presented as precise.
 */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}
