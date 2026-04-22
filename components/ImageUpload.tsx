"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  images: File[];
  onChange: (files: File[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ images, onChange, maxImages = 1 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const valid = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
      if (!valid.length) return;

      const slots = maxImages - images.length;
      const toAdd = valid.slice(0, slots);
      if (!toAdd.length) return;

      const newFiles = [...images, ...toAdd];
      onChange(newFiles);

      toAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) =>
          setPreviews((prev) => [...prev, e.target?.result as string]);
        reader.readAsDataURL(file);
      });
    },
    [images, maxImages, onChange]
  );

  const removeAt = (idx: number) => {
    const newFiles = images.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    onChange(newFiles);
    setPreviews(newPreviews);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Input Images
        </label>
        <span className="text-xs text-gray-500">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className={`grid gap-2 ${previews.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {previews.map((src, idx) => (
            <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-600">
              <img
                src={src}
                alt={`Input ${idx + 1}`}
                className="w-full max-h-32 object-contain bg-gray-900"
              />
              <button
                onClick={() => removeAt(idx)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow"
              >
                ✕
              </button>
              <p className="text-[10px] text-gray-500 px-2 py-1 bg-gray-900/80 truncate">
                {images[idx]?.name}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — only shown when more can be added */}
      {canAddMore && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragging
              ? "border-blue-500 bg-blue-900/20"
              : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50"
          }`}
        >
          <div className="text-2xl mb-1 text-gray-500">🖼️</div>
          <p className="text-xs text-gray-400">
            Drop image{maxImages > 1 ? "s" : ""} here or{" "}
            <span className="text-blue-400 underline">browse</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            PNG, JPG, WEBP · up to {maxImages - images.length} more
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxImages > 1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
        }}
      />
    </div>
  );
}
