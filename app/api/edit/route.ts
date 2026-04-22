import { NextRequest, NextResponse } from "next/server";
import { extractImages } from "@/lib/extractImages";
import { logInfo, logJson, logRaw } from "@/lib/logger";
import type { GenerateResponse } from "@/types";

const OR_BASE = "https://openrouter.ai/api/v1";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const model       = formData.get("model") as string;
  const prompt      = formData.get("prompt") as string;
  const imageFiles  = formData.getAll("image") as File[];
  const aspectRatio = formData.get("aspectRatio") as string | null;
  const imageSize   = formData.get("imageSize") as string | null;
  const quality     = formData.get("quality") as string | null;
  const n           = parseInt((formData.get("n") as string) || "1", 10);
  const outputMods  = (formData.get("outputModalities") as string | null)?.split(",") ?? ["image", "text"];

  if (!model || !prompt || imageFiles.length === 0) {
    return NextResponse.json(
      { error: "model, prompt, and at least one image are required" },
      { status: 400 }
    );
  }

  const imageDataUrls = await Promise.all(
    imageFiles.map(async (f) => {
      const buf  = await f.arrayBuffer();
      const b64  = Buffer.from(buf).toString("base64");
      const mime = f.type || "image/png";
      return `data:${mime};base64,${b64}`;
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageContent: any[] = [
    ...imageDataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
    { type: "text", text: prompt },
  ];

  const imageConfig: Record<string, string> = {};
  if (aspectRatio && aspectRatio !== "auto") imageConfig.aspect_ratio = aspectRatio;
  if (imageSize) imageConfig.image_size = imageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    model,
    messages: [{ role: "user", content: messageContent }],
    modalities: outputMods.filter((m) => m === "image" || m === "text"),
    n,
  };
  if (Object.keys(imageConfig).length > 0) payload.image_config = imageConfig;
  if (quality) payload.quality = quality;

  logJson("edit", "REQUEST →", payload);

  try {
    const orRes = await fetch(`${OR_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "Image Gen Studio",
      },
      body: JSON.stringify(payload),
    });

    const raw = await orRes.text();
    logInfo("edit", `RESPONSE status=${orRes.status}`);
    logRaw("edit", "RESPONSE body (full):", raw);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orData: any;
    try {
      orData = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: `OpenRouter HTTP ${orRes.status}: ${raw.slice(0, 300)}` },
        { status: orRes.status }
      );
    }

    if (!orRes.ok) {
      const errMsg = orData?.error?.message ?? orData?.error ?? JSON.stringify(orData);
      logInfo("edit", `API error: ${errMsg}`);
      return NextResponse.json({ error: errMsg }, { status: orRes.status });
    }

    const { images, debugChoices } = extractImages(orData.choices ?? []);
    logInfo("edit", `extracted images: ${images.length}`);

    const usage = orData.usage
      ? {
          inputTokens:  orData.usage.prompt_tokens     ?? orData.usage.input_tokens,
          outputTokens: orData.usage.completion_tokens ?? orData.usage.output_tokens,
          totalTokens:  orData.usage.total_tokens,
        }
      : undefined;

    const response: GenerateResponse = {
      images,
      usage,
      ...(images.length === 0 ? { debugChoices } : {}),
    };
    return NextResponse.json(response);
  } catch (err) {
    logInfo("edit", `unexpected error: ${err}`);
    return NextResponse.json({ error: "Failed to call OpenRouter API" }, { status: 502 });
  }
}
