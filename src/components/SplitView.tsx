import { useCallback, useRef, useState, useLayoutEffect } from "react";
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
  const zoom = usePdfStore((s) => s.zoom);
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
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftContainerRef = useRef<HTMLDivElement | null>(null);

  const isDraggingRef = useRef(false);
  const splitRatioRef = useRef(0.5);
  const displayZoomRef = useRef(1);
  const fitScaleRef = useRef(1);
  const prevZoomRef = useRef(zoom);

  // Measure left container size once to establish fitScale
  useLayoutEffect(() => {
    const el = leftContainerRef.current;
    if (!el || fitScaleRef.current !== 1 || !page) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const pageAspectRatio = page.widthPt / page.heightPt;
        const containerAspectRatio = rect.width / rect.height;
        const fitScale = containerAspectRatio > pageAspectRatio
          ? (rect.height * 0.9) / (page.widthPt / pageAspectRatio)
          : (rect.width * 0.9) / page.widthPt;
        fitScaleRef.current = fitScale;
        displayZoomRef.current = zoom * fitScale;
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute displayZoom when zoom changes
  useLayoutEffect(() => {
    if (zoom !== prevZoomRef.current) {
      prevZoomRef.current = zoom;
      displayZoomRef.current = zoom * fitScaleRef.current;
    }
  }, [zoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[role="separator"]')) {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0.3, Math.min(0.7, (e.clientX - rect.left) / rect.width));
      splitRatioRef.current = ratio;
      containerRef.current.style.setProperty("--split-ratio", String(ratio));
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setSplitRatio(splitRatioRef.current);
    }
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

  const displayZoom = displayZoomRef.current;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full"
      style={{ "--split-ratio": splitRatio } as React.CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Left: Original page */}
      <div
        ref={leftContainerRef}
        className="relative flex items-center justify-center overflow-hidden"
        style={{ width: `calc(var(--split-ratio) * 100%)` }}
      >
        {documentProxy && page && (
          <div
            className={`transition-opacity duration-150 ${isDragging ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <PdfPageCanvas
              documentProxy={documentProxy}
              pageIndex={currentPageIndex}
              zoom={displayZoom}
              fillWidth
              rounded={false}
            />
          </div>
        )}
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
        className="absolute top-0 flex h-full cursor-col-resize items-center justify-center"
        style={{
          left: `calc(var(--split-ratio) * 100%)`,
          width: "16px",
          transform: "translateX(-50%)",
        }}
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
        style={{ width: `calc((1 - var(--split-ratio)) * 100%)` }}
      >
        {documentProxy && page && canvasCropRect ? (
          <div
            className="relative overflow-hidden"
            style={{
              width: canvasCropRect.width,
              height: canvasCropRect.height,
            }}
          >
            <PdfPageCanvas
              documentProxy={documentProxy}
              pageIndex={currentPageIndex}
              zoom={displayZoom}
              fillWidth
              rounded={false}
              transform={`scale(${cropRect && page.widthPt > 0 ? page.widthPt / cropRect.width : 1})`}
            />
          </div>
        ) : documentProxy && page ? (
          <div className="flex flex-col items-center gap-2 bg-white/75 px-6 py-4 text-sm text-ink/60 dark:bg-white/5 dark:text-ink-light/55">
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
