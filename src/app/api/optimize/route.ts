import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers/registry";
import { getFormat } from "@/lib/formats/registry";

export async function POST(req: NextRequest) {
  let body: {
    prompt?: string;
    providerId?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    formatId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, providerId, model, apiKey, baseUrl, formatId } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const provider = getProvider(providerId ?? "");
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 400 });
  }

  if (provider.requiresApiKey && !apiKey) {
    return NextResponse.json({ error: `${provider.name} requires an API key` }, { status: 400 });
  }

  const format = getFormat(formatId ?? "");
  if (!format) {
    return NextResponse.json({ error: `Unknown format target: ${formatId}` }, { status: 400 });
  }

  try {
    const optimized = await provider.generate({
      apiKey: apiKey ?? "",
      model: model?.trim() || provider.defaultModel,
      baseUrl: baseUrl?.trim() || provider.defaultBaseUrl,
      systemPrompt: format.instructions,
      // Delimited and labeled as data, matching format.instructions, so
      // smaller/weaker models are less likely to treat this as a command to
      // follow directly instead of text to rewrite.
      userPrompt: `<prompt_to_optimize>\n${prompt}\n</prompt_to_optimize>`,
    });

    return NextResponse.json({ optimized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling provider";
    console.error(`/api/optimize: provider "${provider.id}" call failed:`, err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
