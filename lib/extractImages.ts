import type { ImageResult } from "@/types";

/**
 * Extract images from a chat-completions `choices` array.
 *
 * OpenRouter returns images from image-generation models in:
 *
 *  A) choice.message.images[]  ← PRIMARY (OpenRouter-specific field)
 *       Each element: { url: "data:image/png;base64,..." }
 *                  or { image_url: { url: "..." } }
 *
 *  B) choice.message.content  –  array of {type:"image_url", image_url:{url}}
 *       Standard multimodal content block.
 *
 *  C) choice.message.content  –  array of {type:"image", source:{data, media_type}}
 *       Anthropic-style inline image block.
 *
 *  D) choice.message.content  –  plain string that is a data URI or HTTP URL.
 *
 * Text in content blocks immediately before an image block is used as caption.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractImages(choices: any[]): { images: ImageResult[]; debugChoices: unknown } {
  const images: ImageResult[] = [];

  for (const choice of choices) {
    const msg = choice.message;
    if (!msg) continue;

    // ── A  –  message.images[]  (OpenRouter image-gen models) ───────────────
    let foundInImages = false;
    if (Array.isArray(msg.images) && msg.images.length > 0) {
      for (const img of msg.images) {
        if (!img) continue;
        // shape: { url: "data:..." }
        if (typeof img.url === "string") {
          images.push({ url: img.url });
          foundInImages = true;
        }
        // shape: { image_url: { url: "..." } }
        else if (typeof img.image_url?.url === "string") {
          images.push({ url: img.image_url.url });
          foundInImages = true;
        }
      }
    }

    // ── B / C / D  –  content field ─────────────────────────────────────────
    // Skip if images were already extracted from msg.images to avoid duplicates.
    if (foundInImages) continue;
    const content = msg.content;

    if (typeof content === "string") {
      // Shape D
      if (content.startsWith("data:image/") || /^https?:\/\//.test(content)) {
        images.push({ url: content });
      }
    } else if (Array.isArray(content)) {
      let caption = "";
      for (const item of content) {
        if (!item || typeof item !== "object") continue;

        if (item.type === "text") {
          caption = item.text ?? "";
        } else if (item.type === "image_url" && item.image_url?.url) {
          // Shape B
          images.push({ url: item.image_url.url, caption: caption || undefined });
          caption = "";
        } else if (item.type === "image" && item.source?.data) {
          // Shape C
          const mime = item.source.media_type ?? "image/png";
          images.push({
            url: `data:${mime};base64,${item.source.data}`,
            caption: caption || undefined,
          });
          caption = "";
        }
      }
    }
  }

  return { images, debugChoices: choices };
}

/** Replace long non-URL strings with a short prefix + length note for readable logs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeBase64(obj: any): void {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string" && val.length > 300 && !val.startsWith("http")) {
      obj[key] = `${val.slice(0, 80)}…<total ${val.length} chars>`;
    } else if (typeof val === "object") {
      sanitizeBase64(val);
    }
  }
}
