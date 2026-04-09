import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PdfPageCanvas } from "@/components/PdfPageCanvas";
import { usePdfStore } from "@/store/usePdfStore";
import type { PDFDocumentProxy } from "@/lib/pdfjs";
import type { CropRect } from "@/types";
import { selectCurrentPageCrop } from "@/store/selectors";
import { pdfToCanvasPoint } from "@/utils/coordinates";

interface SplitViewProps {
  documentProxy: PDFDocumentProxy | null;
}

export function SplitView({ documentProxy }: SplitViewProps) {
  const { t } = useTranslation();
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const pages = usePdfStore((state) => state.pages);
  const zoom = usePdfStore((state) => state.zoom);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const draftCropRect = usePdfStore((state) => state.draftCropRect);
  const activeDragState = usePdfStore((state) => state.activeDragState);

  const page = pages[currentPageIndex];
  const cropState = selectCurrentPageCrop(
    currentPageIndex,
    pageCrops,
    draftCropRect,
    activeDragState.pageIndex,
  );
  const cropRect: CropRect | null = cropState?.cropRect ?? null;

  const [splitRatio, setSplitRatio] = useState(0.5);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[role="separator"]')) {
      e.preventDefault();
      isDraggingRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0.15, Math.min(0.85, x / rect.width));
      setSplitRatio(ratio);
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Viewport metrics for coordinate translation
  const viewport = page
    ? { scale: zoom, pageHeightPt: page.heightPt, pageWidthPt: page.widthPt }
    : null;

  // Convert PDF-space cropRect to canvas-space coordinates
  const canvasCropRect = viewport && cropRect
    ? {
        ...pdfToCanvasPoint(
          { x: cropRect.x, y: cropRect.y + cropRect.height },
          viewport,
        ),
        width: cropRect.width * zoom,
        height: cropRect.height * zoom,
      }
    : null;

  // Size of the full page in canvas-space pixels
  const pageCanvasWidth = page ? page.widthPt * zoom : 0;
  const pageCanvasHeight = page ? page.heightPt * zoom : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Left: Original page */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ width: `${splitRatio * 100}%` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {documentProxy && page && (
            <PdfPageCanvas
              documentProxy={documentProxy}
              pageIndex={currentPageIndex}
              zoom={zoom}
            />
          )}
        </div>
        <div className="absolute left-4 top-4 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white dark:bg-ink-light dark:text-mist-dark">
          {t("splitView.original")}
        </div>
      </div>

      {/* Divider */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("splitView.adjustSplit")}
        onPointerDown={handlePointerDown}
        className="relative flex w-4 cursor-col-resize items-center justify-center"
      >
        <div className="h-full w-1 rounded-full bg-ink/20 transition-colors hover:bg-ink/40 dark:bg-white/20 dark:hover:bg-white/40" />
        <div className="absolute top-1/2 -translate-y-1/2 rounded-full border border-ink/20 bg-white px-1 py-3 dark:border-white/20 dark:bg-[#1a2636]">
          <svg width="6" height="14" viewBox="0 0 6 14" fill="none" className="text-ink/40 dark:text-white/40">
            <circle cx="2" cy="2" r="1" fill="currentColor" />
            <circle cx="4" cy="7" r="1" fill="currentColor" />
            <circle cx="2" cy="12" r="1" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Right: Cropped preview */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ width: `${(1 - splitRatio) * 100}%` }}
      >
        {documentProxy && page && canvasCropRect ? (
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
              width: canvasCropRect.width,
              height: canvasCropRect.height,
            }}
          >
            {/* Full page canvas positioned so the crop region is at top-left */}
            <div
              className="relative"
              style={{
                width: pageCanvasWidth,
                height: pageCanvasHeight,
                marginLeft: -canvasCropRect.x,
                marginTop: -canvasCropRect.y,
              }}
            >
              <PdfPageCanvas
                documentProxy={documentProxy}
                pageIndex={currentPageIndex}
                zoom={zoom}
              />
            </div>
          </div>
        ) : documentProxy && page ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-white/75 px-6 py-4 text-sm text-ink/60 dark:bg-white/5 dark:text-ink-light/55">
            <span>{t("splitView.noCropYet")}</span>
          </div>
        ) : null}
        {canvasCropRect ? (
          <div className="absolute right-4 top-4 rounded-full bg-sky px-3 py-1 text-xs font-medium text-white dark:bg-sky-dark dark:text-mist-dark">
            {t("splitView.cropped")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
