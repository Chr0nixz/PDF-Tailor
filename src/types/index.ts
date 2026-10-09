export type ThemeName = "paper" | "midnight" | "warm" | "high-contrast";

export type PdfUnit = "pt" | "mm";

export type CropMode = "free" | "preset";

export type ExportMode = "crop-box" | "redraw";

export type ExportScope = "current" | "selected" | "all";

export type DocumentLoadState = "idle" | "loading" | "ready" | "error";

export type CropHandle =
  | "move"
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

export type CropInteraction = "create" | "move" | "resize";

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

export interface SnapGuide {
  orientation: "horizontal" | "vertical";
  position: number;
}

export interface PaperSize {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface PageMetadata {
  /** Source PDF page number (0-based, immutable after creation). */
  sourceId: number;
  /** @deprecated Use `sourceId` instead. Always equals `sourceId` — kept for backwards compat. */
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  rotation: number;
  userRotation: number;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ColumnSplitDirection = "none" | "vertical" | "horizontal" | "grid";

export type GridReadingOrder = "ltr-ttb" | "ttb-ltr" | "rtl-ttb";

export interface ColumnSplitConfig {
  direction: ColumnSplitDirection;
  splitRatio?: number;
  gutterPt?: number;
  rows?: number;
  columns?: number;
  gutterXPt?: number;
  gutterYPt?: number;
  readingOrder?: GridReadingOrder;
}

export interface ExclusionBands {
  headerPt: number;
  footerPt: number;
}

export interface PageCropState {
  pageIndex: number;
  cropRect: CropRect | null;
  mode: CropMode;
  presetSizeId?: string;
  presetAnchor?: PresetAnchor;
  marginsPt: PageMargins;
  updatedAt: number;
  splitConfig?: ColumnSplitConfig;
  exclusionBands?: ExclusionBands;
}

export interface CropTemplate {
  id: string;
  name: string;
  mode: CropMode;
  presetSizeId?: string;
  presetAnchor?: PresetAnchor;
  marginsRatio: PageMargins;
  createdAt: number;
  updatedAt: number;
  splitConfig?: ColumnSplitConfig;
  exclusionBands?: ExclusionBands;
}

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-center";

export type PageNumberFormat = "number-only" | "page-n-of-total" | "slash-total";

export interface PaginationConfig {
  enabled: boolean;
  position: PageNumberPosition;
  format: PageNumberFormat;
  fontSizePt?: number;
  marginPt?: number;
  startNumber?: number;
}

export interface WorkerExportPayload {
  fileBuffer: Uint8Array;
  pageCrops: Record<number, PageCropState>;
  exportMode: ExportMode;
  exportPageIndices?: number[];
  paginationConfig?: PaginationConfig;
}

export interface PdfTailorSession {
  format: "pdf-tailor-session";
  version: "1.2.0";
  exportedAt: number;
  fileName: string | null;
  pageCount: number;
  displayUnit: PdfUnit;
  pageOrder: number[];
  pageCrops: Record<number, PageCropState>;
  templates?: CropTemplate[];
}
