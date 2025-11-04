export type PhotoId = string;

export type PhotoFile = {
  id: PhotoId;
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
  exif?: Record<string, unknown>;
  thumbnailDataUrl: string;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  tags?: string[];
};

export type ScoreBreakdown = {
  sharpness: number;
  exposure: number;
  contrast: number;
  composition: number;
  skinLikelihood: number;
  overall: number;
};

export type ClientBrief = {
  desiredCount: number;
  orientationPreference: "any" | "landscape" | "portrait" | "square";
  prioritizePeople: boolean;
  brightness: "any" | "bright" | "balanced" | "moody";
  contrast: "any" | "low" | "medium" | "high";
};

export type Filters = {
  orientation: "any" | "landscape" | "portrait" | "square";
  minScore: number;
  tags: string[];
};

export type ExportOptions = {
  resizeLongEdge: number; // px
  quality: number; // 0..1
  includeContactSheet: boolean;
};
