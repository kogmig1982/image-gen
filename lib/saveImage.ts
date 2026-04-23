import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { SavedImageMeta } from "@/types";

const SAVE_DIR = path.join(process.cwd(), "public", "generated");

function ensureDir() {
  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
}

function extFromDataUri(uri: string): string {
  if (uri.startsWith("data:image/jpeg") || uri.startsWith("data:image/jpg")) return "jpg";
  if (uri.startsWith("data:image/webp")) return "webp";
  if (uri.startsWith("data:image/gif"))  return "gif";
  return "png";
}

export async function saveImageToDisk(opts: {
  url?: string;
  b64_json?: string;
  prompt: string;
  model: string;
}): Promise<SavedImageMeta | null> {
  const { prompt, model } = opts;
  const { url, b64_json } = opts;

  try {
    ensureDir();

    const id  = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    let buf: Buffer;
    let ext  = "png";

    if (b64_json) {
      buf = Buffer.from(b64_json, "base64");
    } else if (url) {
      if (url.startsWith("data:")) {
        ext = extFromDataUri(url);
        buf = Buffer.from(url.split(",")[1] ?? "", "base64");
      } else {
        const res  = await fetch(url);
        const ct   = res.headers.get("content-type") ?? "";
        if (ct.includes("jpeg") || ct.includes("jpg")) ext = "jpg";
        else if (ct.includes("webp")) ext = "webp";
        buf = Buffer.from(await res.arrayBuffer());
      }
    } else {
      return null;
    }

    const filename = `${id}.${ext}`;
    fs.writeFileSync(path.join(SAVE_DIR, filename), buf);

    const meta: SavedImageMeta = {
      id,
      filename,
      src: `/generated/${filename}`,
      prompt,
      model,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(SAVE_DIR, `${id}.json`), JSON.stringify(meta, null, 2));

    return meta;
  } catch (err) {
    console.error("[saveImage] failed:", err);
    return null;
  }
}
