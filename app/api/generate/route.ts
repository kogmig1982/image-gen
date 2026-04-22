import { NextRequest, NextResponse } from "next/server";
import { getModelParams } from "@/lib/models";
import { extractImages } from "@/lib/extractImages";
import { logInfo, logJson, logRaw } from "@/lib/logger";
import type { GenerateResponse, ImageResult } from "@/types";

const OR_BASE = "https://openrouter.ai/api/v1";

const OR_HEADERS = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "http://localhost:5000",
  "X-Title": "Image Gen Studio",
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { model, prompt, aspectRatio, quality, style, n = 1 } = body as {
    model: string;
    prompt: string;
    aspectRatio?: string;
    quality?: string;
    style?: string;
    n?: number;
  };

  if (!model || !prompt) {
    return NextResponse.json({ error: "model and prompt are required" }, { status: 400 });
  }

  const hints = getModelParams(model);

  // OpenAI DALL-E models → /images/generations (OpenAI-compatible endpoint)
  // All others (Gemini, Flux, etc.) → /chat/completions with modalities: ["image","text"]
  if (model.startsWith("openai/")) {
    return generateViaImagesEndpoint({ apiKey, model, prompt, aspectRatio, quality, style, n, hints });
  }
  return generateViaChatCompletions({ apiKey, model, prompt, aspectRatio, quality, n });
}

// ── /images/generations  (OpenAI DALL-E) ─────────────────────────────────────

async function generateViaImagesEndpoint(opts: {
  apiKey: string; model: string; prompt: string;
  aspectRatio?: string; quality?: string; style?: string; n: number;
  hints: ReturnType<typeof getModelParams>;
}) {
  const { apiKey, model, prompt, aspectRatio, quality, style, n, hints } = opts;
  const size = aspectRatioToSize(aspectRatio);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { model, prompt, n, size, response_format: "url" };
  if (quality && hints.qualities?.includes(quality)) payload.quality = quality;
  if (style   && hints.styles?.includes(style))      payload.style   = style;

  logJson("generate", "REQUEST → POST /api/v1/images/generations", payload);

  try {
    const orRes = await fetch(`${OR_BASE}/images/generations`, {
      method: "POST",
      headers: OR_HEADERS(apiKey),
      body: JSON.stringify(payload),
    });

    const raw = await orRes.text();
    logInfo("generate", `RESPONSE status=${orRes.status}`);
    logRaw("generate", "RESPONSE body:", raw);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orData: any;
    try { orData = JSON.parse(raw); } catch {
      return NextResponse.json(
        { error: `OpenRouter HTTP ${orRes.status}: ${raw.slice(0, 300)}` },
        { status: orRes.status }
      );
    }

    if (!orRes.ok) {
      const errMsg = orData?.error?.message ?? orData?.error ?? JSON.stringify(orData);
      logInfo("generate", `API error: ${errMsg}`);
      return NextResponse.json({ error: errMsg }, { status: orRes.status });
    }

    const images: ImageResult[] = (orData.data ?? []).map(
      (item: { url?: string; b64_json?: string; revised_prompt?: string }) => ({
        url: item.url, b64_json: item.b64_json, revisedPrompt: item.revised_prompt,
      })
    );
    logInfo("generate", `extracted images: ${images.length}`);

    const response: GenerateResponse = {
      images,
      usage: orData.usage ? parseUsage(orData.usage) : undefined,
      ...(images.length === 0 ? { debugChoices: orData } : {}),
    };
    return NextResponse.json(response);
  } catch (err) {
    logInfo("generate", `unexpected error: ${err}`);
    return NextResponse.json({ error: "Failed to call OpenRouter API" }, { status: 502 });
  }
}

// ── /chat/completions  (Gemini, Flux, and everything else) ───────────────────

async function generateViaChatCompletions(opts: {
  apiKey: string; model: string; prompt: string;
  aspectRatio?: string; quality?: string; n: number;
}) {
  const { apiKey, model, prompt, aspectRatio, quality, n } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    model,
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
    stream: false,
    n,
  };

  if (aspectRatio && aspectRatio !== "auto") payload.image_config = { aspect_ratio: aspectRatio };
  if (quality) payload.quality = quality;

  logJson("generate", "REQUEST → POST /api/v1/chat/completions", payload);

  try {
    const orRes = await fetch(`${OR_BASE}/chat/completions`, {
      method: "POST",
      headers: OR_HEADERS(apiKey),
      body: JSON.stringify(payload),
    });

    const raw = await orRes.text();
    logInfo("generate", `RESPONSE status=${orRes.status}`);
    logRaw("generate", "RESPONSE body:", raw);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orData: any;
    try { orData = JSON.parse(raw); } catch {
      return NextResponse.json(
        { error: `OpenRouter HTTP ${orRes.status}: ${raw.slice(0, 300)}` },
        { status: orRes.status }
      );
    }

    if (!orRes.ok) {
      const errMsg = orData?.error?.message ?? orData?.error ?? JSON.stringify(orData);
      logInfo("generate", `API error: ${errMsg}`);
      return NextResponse.json({ error: errMsg }, { status: orRes.status });
    }

    const { images, debugChoices } = extractImages(orData.choices ?? []);
    logInfo("generate", `extracted images: ${images.length}`);

    const response: GenerateResponse = {
      images,
      usage: orData.usage ? parseUsage(orData.usage) : undefined,
      ...(images.length === 0 ? { debugChoices } : {}),
    };
    return NextResponse.json(response);
  } catch (err) {
    logInfo("generate", `unexpected error: ${err}`);
    return NextResponse.json({ error: "Failed to call OpenRouter API" }, { status: 502 });
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function parseUsage(u: Record<string, number>) {
  return {
    inputTokens:  u.prompt_tokens     ?? u.input_tokens,
    outputTokens: u.completion_tokens ?? u.output_tokens,
    totalTokens:  u.total_tokens,
  };
}

function aspectRatioToSize(ratio?: string): string {
  const map: Record<string, string> = {
    "1:1":  "1024x1024",
    "4:3":  "1024x768",
    "3:4":  "768x1024",
    "16:9": "1280x720",
    "9:16": "720x1280",
    "3:2":  "1536x1024",
    "2:3":  "1024x1536",
    "auto": "1024x1024",
  };
  return map[ratio ?? "1:1"] ?? "1024x1024";
}
