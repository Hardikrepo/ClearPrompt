import { GenerateOptions, ProviderAdapter } from "./types";

async function generate({ apiKey, model, systemPrompt, userPrompt }: GenerateOptions): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data.content?.map((block: { text?: string }) => block.text ?? "").join("") ?? "";
  if (!text) throw new Error("Anthropic API returned an empty response");
  return text;
}

export const anthropicProvider: ProviderAdapter = {
  id: "anthropic",
  name: "Anthropic (Claude)",
  defaultModel: "claude-sonnet-5",
  suggestedModels: ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"],
  requiresApiKey: true,
  configurableBaseUrl: false,
  generate,
};
