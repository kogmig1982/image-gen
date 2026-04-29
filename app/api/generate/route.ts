import { NextRequest, NextResponse } from "next/server";
import { extractImages } from "@/lib/extractImages";
import { saveImageToDisk } from "@/lib/saveImage";
import { logInfo, logJson, logRaw } from "@/lib/logger";
import type { GenerateResponse } from "@/types";

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

  const { model, prompt, aspectRatio, quality, style, n = 1, outputModalities } = body as {
    model: string;
    prompt: string;
    aspectRatio?: string;
    quality?: string;
    style?: string;
    n?: number;
    outputModalities?: string[];
  };

  if (!model || !prompt) {
    return NextResponse.json({ error: "model and prompt are required" }, { status: 400 });
  }

  return generateViaChatCompletions({ apiKey, model, prompt, aspectRatio, quality, style, n, outputModalities });
}

async function generateViaChatCompletions(opts: {
  apiKey: string; model: string; prompt: string;
  aspectRatio?: string; quality?: string; style?: string; n: number;
  outputModalities?: string[];
}) {
  const { apiKey, model, prompt, aspectRatio, quality, style, n, outputModalities } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    model,
    messages: [{ role: "user", content: prompt }],
    modalities: outputModalities ?? ["image", "text"],
    stream: false,
    n,
  };

  if (aspectRatio && aspectRatio !== "auto") payload.image_config = { aspect_ratio: aspectRatio };
  if (quality) payload.quality = quality;
  if (style)   payload.style   = style;

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

    const { images: rawImages, debugChoices } = extractImages(orData.choices ?? []);
    logInfo("generate", `extracted images: ${rawImages.length}`);

    const saved = await Promise.all(
      rawImages.map(img => saveImageToDisk({ url: img.url, b64_json: img.b64_json, prompt, model }))
    );
    const images = rawImages.map((img, i) => ({ ...img, localUrl: saved[i]?.src }));

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

function parseUsage(u: Record<string, number>) {
  return {
    inputTokens:  u.prompt_tokens     ?? u.input_tokens,
    outputTokens: u.completion_tokens ?? u.output_tokens,
    totalTokens:  u.total_tokens,
  };
}
