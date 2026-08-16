# ClearPrompt

Paste a messy, unclear, or rambling prompt in. Get back a clean, well-structured prompt
you can actually use with an AI model. It runs entirely on your own computer using
[Ollama](https://ollama.com) — nothing you type ever leaves your machine.

![ClearPrompt overview - for anyone and for developers](docs/handwritten-notes.png)

## Demo

![ClearPrompt demo - optimizing a messy prompt into a structured one](docs/demo.gif)

## What it actually does (plain-language version)

You've probably typed something like *"write me a follow up email idk something professional
but also friendly"* into an AI chat. That works, but it's vague — the AI has to guess what
you actually want.

This app takes that rough idea and rewrites it into a proper, structured prompt: a clear
**Role**, **Context**, **Task**, **Constraints**, and **Output Format** — the kind of prompt
that reliably gets good results out of any AI model. You can then copy that improved prompt
and paste it into any AI assistant, wherever you actually want to use it.

It does this by asking a small AI model (running locally on your machine, not in the cloud)
to act as a "prompt engineer" and rewrite your text for you.

## Run it on your local machine

**Prerequisites**

- [Node.js](https://nodejs.org) 18 or later
- [Ollama](https://ollama.com/download) installed

**Steps**

1. Clone the repo:
   ```bash
   git clone https://github.com/Hardikrepo/ClearPrompt.git
   cd ClearPrompt
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Pull the AI model it uses by default (about 1 GB):
   ```bash
   ollama pull qwen2.5:1.5b
   ```
4. Make sure Ollama is running (it usually starts automatically after installing; if not,
   run `ollama serve` in a separate terminal).
5. Build and start the app:
   ```bash
   npm run build
   npm start
   ```
6. Open **http://localhost:3000** in your browser.

That's it — no API keys, no account, no sign-up. Type a prompt, click **Optimize prompt**,
get a result.

For active development instead of a production build, use `npm run dev` in step 5 and it'll
hot-reload as you edit files.

## How it was built

- **[Next.js](https://nextjs.org)** (React + TypeScript) — one project that's both the
  website you see and the small server behind it.
- **[Tailwind CSS](https://tailwindcss.com)** for styling.
- **[Ollama](https://ollama.com)** — a free program that runs AI models directly on your
  computer's CPU/GPU, instead of sending your data to a company's servers.

There's no database, no user accounts, and no cloud hosting required. Everything runs on
your machine.

## How the app talks to the AI model

This is the important part — here's the actual flow when you click "Optimize prompt":

```
Your browser
    │  "please optimize this prompt: ..."
    ▼
Our Next.js server  (src/app/api/optimize/route.ts)
    │  builds two things:
    │    1. a system prompt: instructions telling the AI "you are a prompt
    │       engineer, rewrite this text into Role/Context/Task/... format"
    │    2. your prompt, wrapped so the AI can't confuse it with something
    │       it's being asked to do directly
    ▼
Ollama, running locally on your machine (http://localhost:11434)
    │  loads the AI model into memory (if not already loaded) and generates
    │  the rewritten prompt, token by token
    ▼
Back through the server, displayed in your browser
```

Everything after your browser happens on your own computer. The request never touches the
internet. This is deliberately routed through our own small server (rather than your browser
calling Ollama directly) so that if something goes wrong, the error shows up in a place we
can actually debug — see `src/app/api/optimize/route.ts`.

## Adding or switching the local model

This is the common case, and it's a one-line change:

1. Download the new model with Ollama:
   ```bash
   ollama pull llama3.2:3b
   ```
2. Open `src/app/page.tsx` and change one constant near the top:
   ```ts
   const OLLAMA_MODEL = "llama3.2:3b"; // was "qwen2.5:1.5b"
   ```
3. Rebuild and restart (`npm run build && npm start`).

That's the entire process — there's no other config, database, or model registry to touch.
Bigger models generally give better, more reliable results but need more free RAM; smaller
models are faster and safer on a memory-constrained machine but occasionally get confused
about what you're asking. (`qwen2.5:1.5b` is a decent middle ground found by trial and error
on a machine with limited free RAM — see the RAM note below.)

## Adding a completely different AI provider (advanced)

The model-swap above only changes *which local Ollama model* is used. If you instead want to
plug in a different AI service entirely (OpenAI, Anthropic, Google Gemini, or any
other OpenAI-compatible API), the app already has a pluggable system for that, it's just not
exposed in the UI right now:

- `src/lib/providers/` — one file per AI provider. Each one is a small adapter that knows
  how to send a request to that specific provider's API and read back the response.
  `openai-compatible.ts` is a catch-all that already works with LM Studio, vLLM, OpenRouter,
  and anything else that speaks the same API shape as OpenAI/Ollama.
- `src/lib/providers/registry.ts` — the list of available providers. Adding a new one is:
  write a new adapter file (copy `anthropic.ts` as the simplest example), then add it to
  this list.
- `src/lib/formats/` — the different "shapes" of optimized prompt it can produce (generic,
  long-context-assistant, coding-agent instructions, image-generation prompts). Same pattern:
  one file per format, registered in `formats/registry.ts`.

The current page (`src/app/page.tsx`) is hardcoded to always use the local Ollama provider
and the generic format for simplicity, but the underlying plumbing to support any provider
and any output format already exists and works — it was tested end-to-end with Anthropic,
OpenAI, and Gemini during development.

## A real lesson learned building this

Worth knowing if you're customizing this yourself: **model size is a genuine trade-off, not
just a speed knob.** During development, the default model was swapped three times:

| Model | RAM needed | What happened |
|---|---|---|
| `llama3.1:8b` | ~5.6 GB | Too big for this machine's available RAM — generation hung indefinitely under memory pressure. |
| `qwen2.5:0.5b` | ~0.4 GB | Fit easily, fast — but too small to reliably follow instructions. It sometimes answered the prompt directly instead of rewriting it, and once leaked its own system instructions into the output. |
| `qwen2.5:1.5b` | ~1 GB | The sweet spot found for this setup: reliably follows the "rewrite, don't answer" instruction while still being light enough to run smoothly. |

If you're running this on a machine with more free RAM, a larger model (`llama3.1:8b` or
similar) will likely give noticeably better results — just make sure the model comfortably
fits your available memory, not just your total memory.

## Project structure

```
src/
  app/
    page.tsx                 the whole UI (textarea, button, result)
    api/optimize/route.ts    the server endpoint that talks to Ollama
  lib/
    providers/                one file per AI backend (Ollama/OpenAI/Anthropic/Gemini)
    formats/                   one file per output "shape" (generic/long-context-assistant/coding-agent/image-gen)
    tokens.ts                  rough token-count estimator, used for the before/after comparison
```
