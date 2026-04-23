"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedImageMeta } from "@/types";

interface Props {
  refreshKey: number;
}

export default function HistoryPanel({ refreshKey }: Props) {
  const [images, setImages] = useState<SavedImageMeta[]>([]);
  const [open, setOpen]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setImages(d.images ?? []));
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    load();
  };

  if (images.length === 0) return null;

  return (
    <div className="border-t border-gray-800 mt-6 pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-3 w-full"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>History ({images.length})</span>
      </button>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
              <a href={img.src} target="_blank" rel="noopener noreferrer">
                <img
                  src={img.src}
                  alt={img.prompt}
                  className="w-full aspect-square object-cover"
                />
              </a>

              {/* overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none group-hover:pointer-events-auto">
                <p className="text-[10px] text-gray-200 line-clamp-2 leading-tight mb-1">{img.prompt}</p>
                <p className="text-[9px] text-gray-400 truncate">{img.model}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {new Date(img.createdAt).toLocaleString()}
                </p>
              </div>

              {/* delete button */}
              <button
                onClick={() => handleDelete(img.id)}
                disabled={deleting === img.id}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-900/80 hover:bg-red-700 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                title="Delete"
              >
                {deleting === img.id ? "…" : "×"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
