import { GenerateOptions, ProviderAdapter } from "./types";

// Local CPU inference on a memory-constrained machine can be genuinely slow,
// especially the first request after a model was evicted from RAM and needs
// to reload from disk. Node's default fetch timeout is too short for that,
// so give local/self-hosted backends a generous allowance.
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

async function generate({ apiKey, model, systemPrompt, userPrompt, baseUrl }: GenerateOptions): Promise<string> {
  let root = (baseUrl || "http://localhost:11434/v1").replace(/\/+$/, "");
  // Every OpenAI-compatible server (Ollama, LM Studio, vLLM, OpenRouter, etc.)
  // serves this API under a "/v1" prefix. If someone pastes the bare host
  // (e.g. "http://localhost:11434") the request would 404, so add it back.
  if (!/\/v1$/i.test(root)) root += "/v1";

  let res: Response;
  try {
    res = await fetch(`${root}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(
        `No response from ${root} after ${REQUEST_TIMEOUT_MS / 1000}s. The model may still be loading, ` +
          `or the machine is under heavy load - try again, or switch to a smaller model.`
      );
    }
    throw new Error(`Couldn't reach ${root}. Is the server running there? (${err instanceof Error ? err.message : err})`);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Provider error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Provider returned an empty response");
  return text;
}

/**
 * Catch-all adapter for any OpenAI-compatible /chat/completions endpoint:
 * Ollama, LM Studio, vLLM, OpenRouter, Together, Groq, self-hosted models, etc.
 * This is how a user plugs in "their own model" without writing an adapter -
 * just point the base URL at it.
 */
export const openaiCompatibleProvider: ProviderAdapter = {
  id: "openai-compatible",
  name: "Local / Custom (Ollama, LM Studio, etc.)",
  defaultModel: "llama3.2:1b",
  suggestedModels: ["llama3.2:1b", "llama3.1:8b", "mistral", "qwen2.5"],
  requiresApiKey: false,
  configurableBaseUrl: true,
  defaultBaseUrl: "http://localhost:11434/v1",
  generate,
};
