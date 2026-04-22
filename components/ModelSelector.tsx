"use client";

import type { UIModel } from "@/types";

interface Props {
  models: UIModel[];
  selected: string;
  onChange: (id: string) => void;
}

export default function ModelSelector({ models, selected, onChange }: Props) {
  const selectedModel = models.find((m) => m.id === selected);
  const providers = [...new Set(models.map((m) => m.provider))];

  if (models.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">Model</label>
        <p className="text-xs text-gray-500 italic">Loading models…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Model
      </label>

      {providers.map((provider) => (
        <div key={provider}>
          <p className="text-xs text-gray-500 mb-1 font-medium">{provider}</p>
          <div className="space-y-1">
            {models
              .filter((m) => m.provider === provider)
              .map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selected === model.id}
                  onClick={() => onChange(model.id)}
                />
              ))}
          </div>
        </div>
      ))}

      {selectedModel && (
        <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800/40 rounded text-xs text-blue-300 space-y-1">
          {selectedModel.description ? (
            <p className="line-clamp-3">{selectedModel.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {selectedModel.supportsImageInput && (
              <Badge color="emerald">Image input</Badge>
            )}
            {selectedModel.params.maxInputImages > 1 && (
              <Badge color="emerald">Up to {selectedModel.params.maxInputImages} images</Badge>
            )}
            {selectedModel.isFree && <Badge color="green">Free</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}

function ModelCard({
  model,
  isSelected,
  onClick,
}: {
  model: UIModel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const priceLabel =
    model.isFree
      ? "Free"
      : model.pricePerImage !== undefined
      ? `~$${model.pricePerImage.toFixed(3)}/img`
      : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-900/30 text-white"
          : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate">{model.name}</span>
        <div className="flex items-center gap-1 shrink-0">
          {model.supportsImageInput && (
            <span className="px-1 py-0.5 bg-emerald-900/50 text-emerald-400 text-[10px] rounded border border-emerald-800/50">
              edit
            </span>
          )}
          {priceLabel && (
            <span className={`text-[10px] ${model.isFree ? "text-emerald-400" : "text-gray-400"}`}>
              {priceLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-900/40 text-emerald-400 border-emerald-800/40",
    green: "bg-green-900/40 text-green-400 border-green-800/40",
    blue: "bg-blue-900/40 text-blue-400 border-blue-800/40",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${colors[color] ?? colors.blue}`}>
      {children}
    </span>
  );
}
