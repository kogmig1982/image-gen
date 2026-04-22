import type { OpenRouterModel, UIModel, ModelParams } from "@/types";

const COMMON_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"];

// Exact-match overrides for known model IDs
const PARAM_OVERRIDES: Record<string, Partial<ModelParams>> = {
  "openai/gpt-image-1": {
    aspectRatios: ["1:1", "3:2", "2:3", "auto"],
    qualities: ["low", "medium", "high"],
    maxN: 1,
    maxInputImages: 16,
  },
  "openai/dall-e-3": {
    aspectRatios: ["1:1", "3:2", "2:3"],
    qualities: ["standard", "hd"],
    styles: ["vivid", "natural"],
    maxN: 1,
    maxInputImages: 0,
  },
  "openai/dall-e-2": {
    aspectRatios: ["1:1"],
    maxN: 4,
    maxInputImages: 1,
  },
};

// Prefix fallbacks
const PREFIX_PARAMS: Array<[string, Partial<ModelParams>]> = [
  ["black-forest-labs/", { aspectRatios: COMMON_RATIOS, imageSizes: ["0.5K", "1K", "2K"], maxN: 1 }],
  ["stability/",         { aspectRatios: COMMON_RATIOS, imageSizes: ["1K", "2K"], maxN: 1 }],
  ["google/",            { aspectRatios: COMMON_RATIOS, imageSizes: ["1K", "2K", "4K"], maxN: 1, maxInputImages: 4 }],
  ["openai/",            { aspectRatios: COMMON_RATIOS, maxN: 1 }],
];

const DEFAULT_PARAMS: ModelParams = {
  aspectRatios: COMMON_RATIOS,
  maxN: 1,
  maxInputImages: 0,
};

export function getModelParams(modelId: string): ModelParams {
  if (PARAM_OVERRIDES[modelId]) {
    return { ...DEFAULT_PARAMS, ...PARAM_OVERRIDES[modelId] };
  }
  const prefix = PREFIX_PARAMS.find(([p]) => modelId.startsWith(p));
  if (prefix) return { ...DEFAULT_PARAMS, ...prefix[1] };
  return DEFAULT_PARAMS;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai:              "OpenAI",
  "black-forest-labs": "Black Forest Labs",
  stability:           "Stability AI",
  google:              "Google",
  anthropic:           "Anthropic",
  mistralai:           "Mistral AI",
  meta:                "Meta",
  sourceful:           "Sourceful",
};

export function extractProvider(modelId: string): string {
  const prefix = modelId.split("/")[0];
  return PROVIDER_NAMES[prefix] ?? prefix;
}

export function buildUIModel(raw: OpenRouterModel): UIModel {
  const supportsImageInput = (raw.architecture?.input_modalities ?? []).includes("image");
  const outputModalities   = raw.architecture?.output_modalities ?? ["image"];

  const priceRaw    = raw.pricing?.image;
  const pricePerImage = priceRaw ? parseFloat(priceRaw) : undefined;
  const isFree      = !pricePerImage || pricePerImage === 0;

  const params = getModelParams(raw.id);

  // If the API says this model accepts image input but our override says 0, bump to 1
  const maxInputImages =
    params.maxInputImages > 0 ? params.maxInputImages : supportsImageInput ? 1 : 0;

  return {
    id:   raw.id,
    name: raw.name.replace(/^[^:]+:\s*/, ""),
    description:        raw.description ?? "",
    provider:           extractProvider(raw.id),
    supportsImageInput,
    outputModalities,
    pricePerImage,
    isFree,
    params: { ...params, maxInputImages },
    raw,
  };
}
