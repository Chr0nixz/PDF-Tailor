export type PdfUnit = "pt" | "mm";

export type CropMode = "free" | "preset";

export type ExportMode = "crop-box" | "redraw";

export type DocumentLoadState = "idle" | "loading" | "ready" | "error";

export type PresetAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropRect extends Rect {
  pageIndex: number;
}

export interface PaperSize {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface PageMetadata {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  rotation: number;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageCropState {
  pageIndex: number;
  cropRect: CropRect | null;
  mode: CropMode;
  presetSizeId?: string;
  presetAnchor?: PresetAnchor;
  marginsPt: PageMargins;
  updatedAt: number;
}

export interface WorkerExportPayload {
  fileBuffer: Uint8Array;
  pageCrops: Record<number, PageCropState>;
  exportMode: ExportMode;
}
