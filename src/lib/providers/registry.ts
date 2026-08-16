import { ProviderAdapter } from "./types";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import { geminiProvider } from "./gemini";
import { openaiCompatibleProvider } from "./openai-compatible";

/**
 * To add a new provider: write an adapter file implementing ProviderAdapter
 * (see anthropic.ts for the simplest example) and add it to this list.
 * For most self-hosted or third-party models, no new adapter is needed at
 * all - openai-compatible.ts covers any /chat/completions-style API.
 */
export const PROVIDERS: ProviderAdapter[] = [
  // Local/custom listed first: it's the default, works with no API key.
  openaiCompatibleProvider,
  anthropicProvider,
  openaiProvider,
  geminiProvider,
];

export function getProvider(id: string): ProviderAdapter | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
