/// <reference lib="webworker" />

import type { ClientBrief, ScoreBreakdown } from "@/types";

export type ScoreRequest = {
  id: string;
  file: File;
  brief: ClientBrief;
};

export type ScoreResponse = {
  id: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
  thumbnailDataUrl: string;
  score: number;
  breakdown: ScoreBreakdown;
};

const THUMB_MAX = 512;

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}

async function imageBitmapFromFile(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

function orientationFromWH(w: number, h: number): "landscape" | "portrait" | "square" {
  if (Math.abs(w - h) < Math.max(w, h) * 0.02) return "square";
  return w >= h ? "landscape" : "portrait";
}

function toCanvas(bitmap: ImageBitmap, maxEdge: number): { canvas: OffscreenCanvas; scale: number } {
  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, scale };
}

function getImageData(canvas: OffscreenCanvas): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function varianceOfLaplacian(gray: Uint8ClampedArray, w: number, h: number): number {
  // 3x3 Laplacian kernel
  const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
  const out: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ix = x + kx;
          const iy = y + ky;
          const idx = iy * w + ix;
          sum += gray[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      out.push(sum);
    }
  }
  const mean = out.reduce((a, b) => a + b, 0) / out.length;
  const variance = out.reduce((a, b) => a + (b - mean) * (b - mean), 0) / out.length;
  return variance;
}

function computeGrayAndHistogram(data: Uint8ClampedArray): { gray: Uint8ClampedArray; hist: Uint32Array } {
  const gray = new Uint8ClampedArray(data.length / 4);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray[j] = v;
    hist[v]++;
  }
  return { gray, hist };
}

function histogramStats(hist: Uint32Array): { mean: number; std: number; clipped: number } {
  const total = hist.reduce((a, b) => a + b, 0);
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += hist[i] * i;
  const mean = sum / total;
  let varSum = 0;
  for (let i = 0; i < 256; i++) varSum += hist[i] * (i - mean) * (i - mean);
  const std = Math.sqrt(varSum / total);
  const clipped = ((hist[0] + hist[255]) / total) * 100; // percent
  return { mean, std, clipped };
}

function edgeMap(gray: Uint8ClampedArray, w: number, h: number): Uint8Array {
  // Simple Sobel magnitude
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0, gy = 0;
      let idx = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++, idx++) {
          const ix = x + kx;
          const iy = y + ky;
          const p = gray[iy * w + ix];
          gx += p * sobelX[idx];
          gy += p * sobelY[idx];
        }
      }
      const mag = Math.hypot(gx, gy);
      out[y * w + x] = mag > 255 ? 255 : mag;
    }
  }
  return out;
}

function compositionScore(edges: Uint8Array, w: number, h: number): number {
  // Score how much edge energy is near rule-of-thirds intersections
  const thirdsX = [Math.round(w / 3), Math.round((2 * w) / 3)];
  const thirdsY = [Math.round(h / 3), Math.round((2 * h) / 3)];
  let energyTotal = 0;
  let energyThirds = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = edges[y * w + x];
      energyTotal += e;
      // Within 5% of width/height around any thirds cross
      const nearX = thirdsX.some((tx) => Math.abs(x - tx) < w * 0.05);
      const nearY = thirdsY.some((ty) => Math.abs(y - ty) < h * 0.05);
      if (nearX && nearY) energyThirds += e;
    }
  }
  if (energyTotal === 0) return 0.5;
  return clamp(energyThirds / energyTotal);
}

function skinLikelihood(data: Uint8ClampedArray): number {
  // Simple skin detection in YCbCr color space
  let skin = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Convert to YCbCr
    const y = 0 + 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (y > 35 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) skin++;
    total++;
  }
  if (total === 0) return 0;
  return skin / total; // 0..1 fraction
}

function computeScore(breakdown: Omit<ScoreBreakdown, "overall">, brief: ClientBrief): number {
  // Base weights
  let wSharp = 0.35;
  let wExposure = 0.2;
  let wContrast = 0.15;
  let wComposition = 0.2;
  let wSkin = 0.1;

  if (brief.prioritizePeople) {
    wSkin += 0.1;
    wSharp += 0.05;
    wComposition += 0.05;
    wContrast -= 0.05;
  }

  // Adjust exposure weight based on brightness preference
  if (brief.brightness === "bright") wExposure += 0.05;
  else if (brief.brightness === "moody") wExposure -= 0.05;

  // Adjust contrast preference
  if (brief.contrast === "high") wContrast += 0.05;
  else if (brief.contrast === "low") wContrast -= 0.05;

  const overall =
    breakdown.sharpness * wSharp +
    breakdown.exposure * wExposure +
    breakdown.contrast * wContrast +
    breakdown.composition * wComposition +
    breakdown.skinLikelihood * wSkin;

  return clamp(overall, 0, 1);
}

async function scoreFile(req: ScoreRequest): Promise<ScoreResponse> {
  const bitmap = await imageBitmapFromFile(req.file);
  const fullW = bitmap.width;
  const fullH = bitmap.height;
  const orientation = orientationFromWH(fullW, fullH);

  // Compute on a decimated canvas for performance
  const { canvas } = toCanvas(bitmap, 1024);
  const imgData = getImageData(canvas);
  const { gray, hist } = computeGrayAndHistogram(imgData.data);
  const varLap = varianceOfLaplacian(gray, canvas.width, canvas.height);
  const edges = edgeMap(gray, canvas.width, canvas.height);
  const comp = compositionScore(edges, canvas.width, canvas.height);
  const { mean, std, clipped } = histogramStats(hist);
  const skin = skinLikelihood(imgData.data);

  // Normalize features to 0..1 heuristically
  const sharpness = clamp(varLap / 5000); // empirical scaling
  const exposure = clamp(1 - clipped / 20) * (mean > 15 && mean < 240 ? 1 : 0.8);
  const contrast = clamp(std / 64);
  const composition = comp;
  const skinLikelihoodScore = clamp(skin / 0.25); // 25% skin considered strong

  const breakdown: ScoreBreakdown = {
    sharpness,
    exposure,
    contrast,
    composition,
    skinLikelihood: skinLikelihoodScore,
    overall: 0, // filled below
  };

  const overall = computeScore(
    {
      sharpness,
      exposure,
      contrast,
      composition,
      skinLikelihood: skinLikelihoodScore,
    },
    req.brief
  );
  breakdown.overall = overall;

  // Thumbnail
  const { canvas: tcanvas } = toCanvas(bitmap, THUMB_MAX);
  const blob = await tcanvas.convertToBlob({ type: "image/webp", quality: 0.85 });
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const thumbnailDataUrl = `data:${blob.type};base64,${base64}`;

  return {
    id: req.id,
    width: fullW,
    height: fullH,
    orientation,
    thumbnailDataUrl,
    score: overall,
    breakdown,
  };
}

self.onmessage = async (e: MessageEvent<ScoreRequest>) => {
  try {
    const result = await scoreFile(e.data);
    (self as unknown as Worker).postMessage({ ok: true, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message });
  }
};
