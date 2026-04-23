import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import type { SavedImageMeta } from "@/types";

const SAVE_DIR = path.join(process.cwd(), "public", "generated");

export async function GET() {
  if (!fs.existsSync(SAVE_DIR)) {
    return NextResponse.json({ images: [] });
  }

  const files = fs.readdirSync(SAVE_DIR).filter((f) => f.endsWith(".json"));

  const images: SavedImageMeta[] = files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(SAVE_DIR, f), "utf-8")) as SavedImageMeta;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SavedImageMeta[];

  images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ images });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..")) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const meta = path.join(SAVE_DIR, `${id}.json`);
  if (!fs.existsSync(meta)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { filename } = JSON.parse(fs.readFileSync(meta, "utf-8")) as SavedImageMeta;
  fs.rmSync(path.join(SAVE_DIR, filename), { force: true });
  fs.rmSync(meta, { force: true });

  return NextResponse.json({ ok: true });
}
