import { GenerateOptions, ProviderAdapter } from "./types";

async function generate({ apiKey, model, systemPrompt, userPrompt }: GenerateOptions): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI API returned an empty response");
  return text;
}

export const openaiProvider: ProviderAdapter = {
  id: "openai",
  name: "OpenAI",
  defaultModel: "gpt-5",
  suggestedModels: ["gpt-5", "gpt-5-mini", "gpt-4.1"],
  requiresApiKey: true,
  configurableBaseUrl: false,
  generate,
};
