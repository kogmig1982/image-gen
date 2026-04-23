// Raw model shape returned by OpenRouter /v1/models?output_modalities=image
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request: string;
  };
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
  };
  context_length?: number;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
}

// Parameter presets we attach per model
export interface ModelParams {
  aspectRatios: string[];  // e.g. ["1:1", "16:9", "9:16"]
  imageSizes?: string[];   // e.g. ["1K", "2K", "4K"]
  qualities?: string[];
  styles?: string[];
  maxN: number;
  maxInputImages: number;  // 0 = no image input support
}

// OpenRouterModel enriched with UI-ready fields
export interface UIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  supportsImageInput: boolean;  // input_modalities includes "image"
  outputModalities: string[];   // e.g. ["image"] or ["image","text"]
  pricePerImage?: number;
  isFree: boolean;
  params: ModelParams;
  raw: OpenRouterModel;
}

// --- API layer ---

export interface ImageResult {
  url?: string;
  b64_json?: string;
  revisedPrompt?: string;
  caption?: string;  // text returned alongside the image (e.g. Gemini)
  localUrl?: string; // served from /generated/<id>.png after saving to disk
}

export interface SavedImageMeta {
  id: string;
  filename: string;
  src: string;       // public URL e.g. /generated/<id>.png
  prompt: string;
  model: string;
  createdAt: string; // ISO string
}

export interface GenerateResponse {
  images: ImageResult[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  error?: string;
  /** Raw choices from OpenRouter — only present when no images were extracted, for debugging. */
  debugChoices?: unknown;
}
