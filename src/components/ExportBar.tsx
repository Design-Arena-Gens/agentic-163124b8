"use client";

import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { useStore } from "@/store/useStore";
import type { ExportOptions, PhotoFile } from "@/types";

async function resizeImageDataUrl(srcDataUrl: string, longEdge: number, quality: number): Promise<Blob> {
  const img = new Image();
  img.src = srcDataUrl;
  await img.decode();
  const scale = Math.min(1, longEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality));
  return blob;
}

async function exportZip(photos: PhotoFile[], options: ExportOptions) {
  const zip = new JSZip();
  const meta: any[] = [];
  let idx = 1;
  for (const p of photos) {
    const blob = await resizeImageDataUrl(p.thumbnailDataUrl, options.resizeLongEdge, options.quality);
    const fname = `${String(idx).padStart(3, "0")}_${p.name.replace(/\s+/g, "_")}.jpg`;
    zip.file(fname, blob);
    meta.push({ file: fname, score: p.score, width: p.width, height: p.height, orientation: p.orientation });
    idx++;
  }
  zip.file("metadata.json", JSON.stringify({ exportedAt: new Date().toISOString(), photos: meta }, null, 2));
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `selections_${new Date().toISOString().slice(0,10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportContactSheet(photos: PhotoFile[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cols = 3;
  const rows = 4;
  const cellW = (pageW - 72) / cols; // 1-inch margins
  const cellH = (pageH - 72) / rows;
  let i = 0;
  for (const p of photos) {
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const x = 36 + col * cellW;
    const y = 36 + row * cellH;
    const img = new Image();
    img.src = p.thumbnailDataUrl;
    await img.decode();
    const scale = Math.min(cellW / img.width, (cellH - 24) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    doc.addImage(p.thumbnailDataUrl, "JPEG", x, y, w, h);
    doc.setFontSize(8);
    doc.text(`${Math.round((p.score ?? 0) * 100)} | ${p.name}`, x, y + h + 12);
    i++;
    if (i % (cols * rows) === 0 && i < photos.length) doc.addPage();
  }
  doc.save(`contact_sheet_${new Date().toISOString().slice(0,10)}.pdf`);
}

export default function ExportBar() {
  const { photos, selectedIds } = useStore();
  const selected = photos.filter((p) => selectedIds.has(p.id));
  const picks = selected.length > 0 ? selected : photos.slice(0, 100);

  const exportZipClick = async () => {
    const opts: ExportOptions = { resizeLongEdge: 2048, quality: 0.9, includeContactSheet: false };
    await exportZip(picks, opts);
  };

  const exportPdfClick = async () => {
    await exportContactSheet(picks);
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={exportZipClick} className="rounded bg-emerald-600 text-white px-3 py-1 text-sm">Export ZIP</button>
      <button onClick={exportPdfClick} className="rounded bg-sky-600 text-white px-3 py-1 text-sm">Contact Sheet PDF</button>
      <span className="text-sm text-zinc-500">Exporting {picks.length} photos</span>
    </div>
  );
}
