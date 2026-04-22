"use client";

import { useEffect, useState } from "react";
import { buildUIModel } from "@/lib/models";
import ModelSelector from "./ModelSelector";
import ParameterControls, { type Params } from "./ParameterControls";
import ImageUpload from "./ImageUpload";
import ResultDisplay from "./ResultDisplay";
import type { OpenRouterModel, UIModel, GenerateResponse } from "@/types";

function defaultParams(model: UIModel | null): Params {
  const mp = model?.params;
  return {
    aspectRatio: mp?.aspectRatios[0] ?? "1:1",
    imageSize:   mp?.imageSizes?.[1] ?? mp?.imageSizes?.[0] ?? "",
    quality:     mp?.qualities?.[0] ?? "",
    style:       mp?.styles?.[0] ?? "",
    n: 1,
  };
}

export default function ImageGenerator() {
  const [models, setModels]         = useState<UIModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [params, setParams]         = useState<Params>(defaultParams(null));
  const [prompt, setPrompt]         = useState("");
  const [images, setImages]         = useState<File[]>([]);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<GenerateResponse | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: { data?: OpenRouterModel[]; error?: string }) => {
        if (data.error) { setModelsError(data.error); return; }
        const uiModels = (data.data ?? []).map(buildUIModel);
        setModels(uiModels);
        if (uiModels.length > 0) {
          setSelectedId(uiModels[0].id);
          setParams(defaultParams(uiModels[0]));
        }
      })
      .catch((err) => setModelsError(String(err)));
  }, []);

  const selectedModel = models.find((m) => m.id === selectedId) ?? null;

  const handleModelChange = (id: string) => {
    const model = models.find((m) => m.id === id) ?? null;
    setSelectedId(id);
    setParams(defaultParams(model));
    if (model && !model.supportsImageInput) setImages([]);
  };

  const useEditMode = images.length > 0 && !!selectedModel?.supportsImageInput;

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedId || !selectedModel) return;

    setLoading(true);
    setResult(null);

    try {
      let res: Response;

      if (useEditMode) {
        const form = new FormData();
        form.append("model", selectedId);
        form.append("prompt", prompt);
        images.forEach((img) => form.append("image", img, img.name));
        form.append("aspectRatio", params.aspectRatio);
        if (params.imageSize) form.append("imageSize", params.imageSize);
        if (params.quality)   form.append("quality", params.quality);
        form.append("n", String(params.n));
        form.append("outputModalities", selectedModel.outputModalities.join(","));

        res = await fetch("/api/edit", { method: "POST", body: form });
      } else {
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model:            selectedId,
            prompt,
            aspectRatio:      params.aspectRatio,
            imageSize:        params.imageSize || undefined,
            quality:          params.quality   || undefined,
            style:            params.style     || undefined,
            n:                params.n,
            outputModalities: selectedModel.outputModalities,
          }),
        });
      }

      const data: GenerateResponse = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ images: [], error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const maxInputImages = selectedModel?.params.maxInputImages ?? 0;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-gray-800 bg-gray-900 ${
          sidebarOpen ? "w-72" : "w-0"
        }`}
      >
        <div className="w-72 h-full overflow-y-auto p-4 space-y-6">
          <ModelSelector models={models} selected={selectedId} onChange={handleModelChange} />

          {modelsError && (
            <p className="text-xs text-red-400 bg-red-900/10 border border-red-800/30 rounded px-2 py-1">
              {modelsError}
            </p>
          )}

          <hr className="border-gray-700" />

          <ParameterControls
            model={selectedModel}
            params={params}
            onChange={setParams}
            imageCount={images.length}
          />

          {maxInputImages > 0 && (
            <>
              <hr className="border-gray-700" />
              <ImageUpload images={images} onChange={setImages} maxImages={maxInputImages} />
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Image Gen Studio
          </span>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            {selectedModel && (
              <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 truncate max-w-48">
                {selectedModel.name}
              </span>
            )}
            {useEditMode && (
              <span className="px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-700 text-emerald-300 whitespace-nowrap">
                Edit Mode
              </span>
            )}
          </div>
        </header>

        {/* Prompt bar */}
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/40 shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
                }}
                placeholder={
                  useEditMode
                    ? "Describe how you want to edit the image…"
                    : "Describe the image you want to generate…"
                }
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-600 mt-1 pl-1">Ctrl+Enter to generate</p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim() || !selectedId}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating
                </span>
              ) : useEditMode ? (
                "Edit Image"
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <main className="flex-1 overflow-y-auto p-4">
          <ResultDisplay result={result} loading={loading} />
        </main>
      </div>
    </div>
  );
}
