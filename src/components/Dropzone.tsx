"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import type { ClientBrief, PhotoFile } from "@/types";

function generateId(file: File): string {
  const salt = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${salt}-${file.name}-${file.size}-${file.lastModified}`;
}

export default function Dropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upsertPhoto, setScoring, brief } = useStore();
  const [busyCount, setBusyCount] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    workerRef.current = new Worker(new URL("@/workers/scorer.ts", import.meta.url), { type: "module" });
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0 || !workerRef.current) return;
      setScoring(true);

      const pendingMap = new Map<string, File>();

      const onMessage = (ev: MessageEvent<any>) => {
        const data = ev.data;
        if (!data.ok) {
          console.error("Scoring error:", data.error);
        } else {
          const res = data.result as {
            id: string;
            width: number;
            height: number;
            orientation: PhotoFile["orientation"];
            thumbnailDataUrl: string;
            score: number;
            breakdown: any;
          };
          const f = pendingMap.get(res.id);
          if (f) {
            const photo: PhotoFile = {
              id: res.id,
              file: f,
              name: f.name,
              size: f.size,
              type: f.type,
              lastModified: f.lastModified,
              width: res.width,
              height: res.height,
              orientation: res.orientation,
              thumbnailDataUrl: res.thumbnailDataUrl,
              score: res.score,
              scoreBreakdown: res.breakdown,
              tags: [],
            };
            upsertPhoto(photo);
            pendingMap.delete(res.id);
          }
        }
        setBusyCount((c) => Math.max(0, c - 1));
      };

      const worker = workerRef.current;
      worker.addEventListener("message", onMessage);

      const BRIEF: ClientBrief = brief; // snapshot

      for (const file of arr) {
        if (!file.type.startsWith("image/")) continue;
        const id = generateId(file);
        pendingMap.set(id, file);
        setBusyCount((c) => c + 1);
        worker.postMessage({ id, file, brief: BRIEF });
      }

      await new Promise<void>((resolve) => {
        const tick = () => {
          if (pendingMap.size === 0 && busyCount <= 0) resolve();
          else setTimeout(tick, 200);
        };
        tick();
      });

      worker.removeEventListener("message", onMessage);
      setScoring(false);
    },
    [upsertPhoto, brief, setScoring, busyCount]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      await handleFiles(files);
    },
    [handleFiles]
  );

  const onClick = useCallback(() => inputRef.current?.click(), []);

  const onChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await handleFiles(e.target.files);
    e.currentTarget.value = "";
  }, [handleFiles]);

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
      onClick={onClick}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onChange} />
      <p className="text-zinc-700 dark:text-zinc-300">Drag & drop photos, or click to select</p>
      <p className="text-sm text-zinc-500 mt-2">Thousands supported; scoring runs in the background</p>
      {busyCount > 0 && (
        <p className="text-sm text-indigo-600 mt-3">Scoring {busyCount} photos?</p>
      )}
    </div>
  );
}
