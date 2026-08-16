"use client";

import { useMemo, useState } from "react";
import { estimateTokens } from "@/lib/tokens";

// Hardcoded to the local Ollama backend - no provider, model, API key, or
// format picker. The pluggable provider/format registries still exist under
// src/lib for anyone who wants to wire up a different backend; this page
// just always uses the simplest local path, proxied through our own
// /api/optimize route so failures show up in server logs.
//
// qwen2.5:1.5b (~1GB RAM) is the default. This machine's free RAM fluctuates
// a lot (2-6GB depending on what else is running), so llama3.1:8b (~5.6GB)
// and llama3.2:1b (~1.3GB) both hung under memory pressure. qwen2.5:0.5b
// fit easily but was too small to follow instructions reliably - it leaked
// its own system prompt into the output. 1.5b is the middle ground: still
// light, but with much better instruction-following in testing.
const OLLAMA_MODEL = "qwen2.5:1.5b";
const OLLAMA_BASE_URL = "http://localhost:11434/v1";
const FORMAT_ID = "generic";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleOptimize() {
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          providerId: "openai-compatible",
          model: OLLAMA_MODEL,
          baseUrl: OLLAMA_BASE_URL,
          formatId: FORMAT_ID,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data.optimized);
    } catch (err) {
      // Provider errors from the API route already explain what went wrong
      // (timed out, couldn't reach the server, bad response, etc.) - only
      // fall back to a generic message for truly unexpected failures.
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "optimized-prompt.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  const canSubmit = prompt.trim().length > 0 && !loading;

  const originalTokens = useMemo(() => estimateTokens(prompt), [prompt]);
  const optimizedTokens = useMemo(() => (result ? estimateTokens(result) : 0), [result]);
  const tokenDelta = originalTokens - optimizedTokens;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            ClearPrompt
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Paste any rough prompt and get back a clean, well-structured version. Runs entirely
            on your device via Ollama ({OLLAMA_MODEL}) - nothing leaves your machine.
          </p>
        </header>

        <section className="flex flex-col gap-2">
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste your messy, long, or unclear prompt here..."
            rows={10}
            className="w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </section>

        <button
          onClick={handleOptimize}
          disabled={!canSubmit}
          className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {loading ? "Optimizing..." : "Optimize prompt"}
        </button>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Optimized prompt
              </label>
              <div className="flex gap-4">
                <button
                  onClick={handleCopy}
                  className="text-xs font-medium text-zinc-600 underline hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleDownload}
                  className="text-xs font-medium text-zinc-600 underline hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Download .md
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <span>Original: ~{originalTokens} tokens</span>
              <span>Optimized: ~{optimizedTokens} tokens</span>
              {tokenDelta > 0 ? (
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  ~{tokenDelta} tokens saved ({Math.round((tokenDelta / originalTokens) * 100)}%)
                </span>
              ) : tokenDelta < 0 ? (
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  ~{Math.abs(tokenDelta)} tokens longer - traded for clarity and structure
                </span>
              ) : (
                <span>No net change in length</span>
              )}
            </div>

            <pre className="whitespace-pre-wrap rounded-lg border border-zinc-300 bg-white p-4 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              {result}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
