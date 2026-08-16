import { GenerateOptions, ProviderAdapter } from "./types";

async function generate({ apiKey, model, systemPrompt, userPrompt }: GenerateOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini API returned an empty response");
  return text;
}

export const geminiProvider: ProviderAdapter = {
  id: "gemini",
  name: "Google (Gemini)",
  defaultModel: "gemini-2.5-pro",
  suggestedModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
  requiresApiKey: true,
  configurableBaseUrl: false,
  generate,
};
