"use client";

import { useStore } from "@/store/useStore";
import { useCallback } from "react";

export default function ShareBar() {
  const { photos, selectedIds } = useStore();

  const selected = photos.filter((p) => selectedIds.has(p.id));
  const picks = selected.length > 0 ? selected : photos.slice(0, 50);

  const makeShareLink = useCallback(() => {
    const payload = picks.map((p) => ({ n: p.name, s: Math.round((p.score ?? 0) * 100), t: p.thumbnailDataUrl }));
    const json = JSON.stringify({ at: new Date().toISOString(), photos: payload });
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const url = `${location.origin}/review?state=${b64}`;
    navigator.clipboard.writeText(url);
    alert("Copied review link to clipboard (may be large).");
  }, [picks]);

  const downloadStandalone = useCallback(() => {
    const payload = picks.map((p) => ({ n: p.name, s: Math.round((p.score ?? 0) * 100), t: p.thumbnailDataUrl }));
    const html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><title>Photo Review</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:16px;background:#0b0b0b;color:#e5e5e5}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}.card{position:relative;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden}.card img{width:100%;height:100%;object-fit:cover}.badge{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;border-radius:4px;padding:2px 4px}</style></head><body><h1>Photo Review</h1><p>${picks.length} photos</p><div class=grid>${payload
      .map(
        (p) =>
          `<div class=card><img src=\"${p.t}\" alt=\"${p.n}\"><div class=badge>${p.s}</div></div>`
      )
      .join("")}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [picks]);

  return (
    <div className="flex items-center gap-3">
      <button onClick={makeShareLink} className="rounded bg-zinc-800 text-white px-3 py-1 text-sm">Copy Share Link</button>
      <button onClick={downloadStandalone} className="rounded bg-zinc-700 text-white px-3 py-1 text-sm">Download Review HTML</button>
      <span className="text-sm text-zinc-500">Sharing {picks.length} photos</span>
    </div>
  );
}
