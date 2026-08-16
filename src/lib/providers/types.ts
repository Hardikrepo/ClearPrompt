export interface GenerateOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface ProviderAdapter {
  id: string;
  name: string;
  defaultModel: string;
  /** Suggested models shown in the UI; field stays freeform so any model name works. */
  suggestedModels: string[];
  requiresApiKey: boolean;
  /** Whether the UI should show a base URL field (OpenAI-compatible / self-hosted backends). */
  configurableBaseUrl: boolean;
  defaultBaseUrl?: string;
  generate(opts: GenerateOptions): Promise<string>;
}
