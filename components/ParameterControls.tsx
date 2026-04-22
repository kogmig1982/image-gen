"use client";

import type { UIModel } from "@/types";

export interface Params {
  aspectRatio: string;
  imageSize: string;
  quality: string;
  style: string;
  n: number;
}

interface Props {
  model: UIModel | null;
  params: Params;
  onChange: (params: Params) => void;
  imageCount: number;
}

export default function ParameterControls({ model, params, onChange, imageCount }: Props) {
  if (!model) return null;

  const { params: mp } = model;
  const set = (key: keyof Params, value: string | number) =>
    onChange({ ...params, [key]: value });

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Parameters
      </label>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Aspect Ratio</label>
        <div className="grid grid-cols-3 gap-1.5">
          {mp.aspectRatios.map((r) => (
            <button
              key={r}
              onClick={() => set("aspectRatio", r)}
              className={`py-1.5 rounded-lg text-xs font-mono border transition-all ${
                params.aspectRatio === r
                  ? "border-blue-500 bg-blue-900/40 text-blue-300"
                  : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Image Size (resolution tier) */}
      {mp.imageSizes && mp.imageSizes.length > 0 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Resolution</label>
          <div className="flex gap-2">
            {mp.imageSizes.map((s) => (
              <button
                key={s}
                onClick={() => set("imageSize", s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  params.imageSize === s
                    ? "border-blue-500 bg-blue-900/40 text-blue-300"
                    : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quality */}
      {mp.qualities && mp.qualities.length > 0 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Quality</label>
          <div className="flex gap-2">
            {mp.qualities.map((q) => (
              <button
                key={q}
                onClick={() => set("quality", q)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize border transition-all ${
                  params.quality === q
                    ? "border-blue-500 bg-blue-900/40 text-blue-300"
                    : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Style */}
      {mp.styles && mp.styles.length > 0 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Style</label>
          <div className="flex gap-2">
            {mp.styles.map((s) => (
              <button
                key={s}
                onClick={() => set("style", s)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize border transition-all ${
                  params.style === s
                    ? "border-purple-500 bg-purple-900/40 text-purple-300"
                    : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Number of output images */}
      {mp.maxN > 1 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Output Images:{" "}
            <span className="text-white font-semibold">{params.n}</span>
          </label>
          <input
            type="range"
            min={1}
            max={mp.maxN}
            value={params.n}
            onChange={(e) => set("n", parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
            <span>1</span>
            <span>{mp.maxN}</span>
          </div>
        </div>
      )}

      {/* Status badges */}
      {imageCount > 0 && model.supportsImageInput && (
        <div className="text-xs text-emerald-400 bg-emerald-900/10 border border-emerald-800/30 rounded-lg px-3 py-2">
          Edit mode — {imageCount} image{imageCount > 1 ? "s" : ""} will be sent to the model.
        </div>
      )}
      {imageCount > 0 && !model.supportsImageInput && (
        <div className="text-xs text-amber-400 bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2">
          This model does not accept image input. Uploaded images will be ignored.
        </div>
      )}
    </div>
  );
}
