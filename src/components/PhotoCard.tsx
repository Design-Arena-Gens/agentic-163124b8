"use client";

import { useStore } from "@/store/useStore";
import type { PhotoFile } from "@/types";
import clsx from "clsx";

export default function PhotoCard({ photo }: { photo: PhotoFile }) {
  const { toggleSelected, selectedIds } = useStore();
  const isSelected = selectedIds.has(photo.id);

  return (
    <div
      className={clsx(
        "relative rounded overflow-hidden border",
        isSelected ? "border-indigo-600 ring-2 ring-indigo-400" : "border-zinc-200 dark:border-zinc-800"
      )}
      onClick={() => toggleSelected(photo.id)}
    >
      <img src={photo.thumbnailDataUrl} alt={photo.name} className="w-full h-full object-cover" />
      <div className="absolute top-1 left-1 text-[11px] bg-black/60 text-white rounded px-1">
        {Math.round((photo.score ?? 0) * 100)}
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white p-2 text-xs flex items-center justify-between">
        <span>{photo.orientation}</span>
        <span>
          {photo.width}?{photo.height}
        </span>
      </div>
      {isSelected && (
        <div className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] px-1 rounded">Selected</div>
      )}
    </div>
  );
}
