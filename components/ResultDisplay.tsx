"use client";

import { useState } from "react";
import type { GenerateResponse } from "@/types";

interface Props {
  result: GenerateResponse | null;
  loading: boolean;
}

export default function ResultDisplay({ result, loading }: Props) {
  const [copiedIdx, setCopiedIdx]   = useState<number | null>(null);
  const [showDebug, setShowDebug]   = useState(false);

  const copyUrl = async (url: string, idx: number) => {
    await navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Generating…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-600 space-y-2">
        <p className="text-5xl">🎨</p>
        <p className="text-sm">Your generated images will appear here</p>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="rounded-xl border border-red-800/50 bg-red-900/10 px-5 py-4 text-sm text-red-400">
        <p className="font-semibold mb-1">Error</p>
        <pre className="font-mono text-xs whitespace-pre-wrap break-all">{result.error}</pre>
      </div>
    );
  }

  const hasImages = result.images.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Token usage ─────────────────────────────────────────────────── */}
      {result.usage && (
        <div className="flex flex-wrap gap-2 text-xs">
          {result.usage.inputTokens !== undefined && (
            <Chip label="Input tokens" value={result.usage.inputTokens.toLocaleString()} color="blue" />
          )}
          {result.usage.outputTokens !== undefined && (
            <Chip label="Output tokens" value={result.usage.outputTokens.toLocaleString()} color="purple" />
          )}
          {result.usage.totalTokens !== undefined && (
            <Chip label="Total tokens" value={result.usage.totalTokens.toLocaleString()} color="gray" />
          )}
        </div>
      )}

      {/* ── No images returned — show debug panel ────────────────────────── */}
      {!hasImages && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-900/10 px-5 py-4 text-sm text-amber-400 space-y-2">
          <p className="font-semibold">No images in response</p>
          <p className="text-xs text-amber-300/70">
            The request succeeded and tokens were consumed, but the model did not return any image
            content blocks. Check the server terminal for the full response structure.
          </p>
          {result.debugChoices !== undefined && (
            <div>
              <button
                onClick={() => setShowDebug((v) => !v)}
                className="text-xs underline text-amber-400 hover:text-amber-200"
              >
                {showDebug ? "Hide" : "Show"} raw response
              </button>
              {showDebug && (
                <pre className="mt-2 text-[10px] text-gray-400 bg-gray-900 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">
                  {JSON.stringify(result.debugChoices, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Images ──────────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${result.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {result.images.map((img, idx) => {
          const src = img.url ?? (img.b64_json ? `data:image/png;base64,${img.b64_json}` : null);
          if (!src) return null;

          return (
            <div key={idx} className="space-y-2">
              <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
                <img src={src} alt={`Generated image ${idx + 1}`} className="w-full" />
              </div>

              {img.revisedPrompt && (
                <p className="text-xs text-gray-500 italic px-1">Revised: "{img.revisedPrompt}"</p>
              )}
              {img.caption && (
                <p className="text-xs text-gray-400 px-1">{img.caption}</p>
              )}

              <div className="flex gap-2">
                <a
                  href={src}
                  download={`image-gen-${idx + 1}.png`}
                  className="flex-1 text-center py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 transition-colors"
                >
                  Download
                </a>
                <button
                  onClick={() => copyUrl(src, idx)}
                  className="flex-1 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 transition-colors"
                >
                  {copiedIdx === idx ? "Copied!" : "Copy URL"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-900/30 border-blue-800/40 text-blue-300",
    purple: "bg-purple-900/30 border-purple-800/40 text-purple-300",
    gray:   "bg-gray-800 border-gray-700 text-gray-300",
  };
  return (
    <span className={`px-2 py-1 rounded-md border ${colors[color] ?? colors.gray}`}>
      {label}: <span className="font-semibold">{value}</span>
    </span>
  );
}
