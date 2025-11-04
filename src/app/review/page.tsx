"use client";

import { useEffect, useMemo, useState } from "react";

type ReviewPhoto = { n: string; s: number; t: string };

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewPhoto[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const state = params.get("state");
    if (!state) return;
    try {
      const json = decodeURIComponent(escape(atob(state)));
      const parsed = JSON.parse(json);
      setItems(parsed.photos || []);
    } catch (e) {
      console.error("Failed to parse state", e);
    }
  }, []);

  const total = items.length;

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Client Review</h1>
        <p className="text-sm text-zinc-400">{total} photos</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map((p, i) => (
            <div key={i} className="relative rounded overflow-hidden border border-zinc-800">
              <img src={p.t} alt={p.n} className="w-full h-full object-cover" />
              <div className="absolute top-1 left-1 text-[11px] bg-black/60 text-white rounded px-1">{p.s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
