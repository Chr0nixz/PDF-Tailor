import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CropDimensionsTooltip } from "@/components/CropDimensionsTooltip";
import { CropOverlay } from "@/components/CropOverlay";
import { CropRectangle } from "@/components/CropRectangle";
import { PdfPageCanvas } from "@/components/PdfPageCanvas";
import { Skeleton } from "@/components/Skeleton";
import { useCropSelection } from "@/hooks/useCropSelection";
import { usePdfStore } from "@/store/usePdfStore";
import { selectCurrentPageCrop } from "@/store/selectors";
import type { ViewportMetrics } from "@/utils/coordinates";
import type { PDFDocumentProxy } from "@/lib/pdfjs";

interface WorkspaceProps {
  documentProxy: PDFDocumentProxy | null;
}

export function Workspace({ documentProxy }: WorkspaceProps) {
  const { t } = useTranslation();
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const pages = usePdfStore((state) => state.pages);
  const zoom = usePdfStore((state) => state.zoom);
  const setZoom = usePdfStore((state) => state.setZoom);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const documentLoadProgress = usePdfStore((state) => state.documentLoadProgress);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const draftCropRect = usePdfStore((state) => state.draftCropRect);
  const activeDragState = usePdfStore((state) => state.activeDragState);
  const page = pages[currentPageIndex];
  const viewport = useMemo<ViewportMetrics | null>(
    () =>
      page
        ? {
            scale: zoom,
            pageWidthPt: page.widthPt,
            pageHeightPt: page.heightPt,
          }
        : null,
    [page, zoom],
  );
  const currentCrop = selectCurrentPageCrop(
    currentPageIndex,
    pageCrops,
    draftCropRect,
    activeDragState.pageIndex,
  )?.cropRect;
  const cropLayerRef = useRef<HTMLDivElement | null>(null);
  const viewportFrameRef = useRef<HTMLDivElement | null>(null);
  const { cropRect, snapGuides, startCreate, startMove, startResize } = useCropSelection({
    containerRef: cropLayerRef,
    viewport,
    pageIndex: currentPageIndex,
    pageWidthPt: page?.widthPt ?? 0,
    pageHeightPt: page?.heightPt ?? 0,
    cropRect: currentCrop ?? null,
  });

  const applyZoomPreset = (mode: "actual" | "fit-width" | "fit-page") => {
    if (!page) {
      return;
    }

    if (mode === "actual") {
      setZoom(1);
      return;
    }

    const frame = viewportFrameRef.current;
    if (!frame) {
      return;
    }

    const styles = window.getComputedStyle(frame);
    const horizontalPadding =
      Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
    const verticalPadding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const availableWidth = Math.max(120, frame.clientWidth - horizontalPadding);
    const availableHeight = Math.max(120, frame.clientHeight - verticalPadding);
    const fitWidthZoom = availableWidth / page.widthPt;
    const fitPageZoom = Math.min(fitWidthZoom, availableHeight / page.heightPt);
    const nextZoom = mode === "fit-width" ? fitWidthZoom : fitPageZoom;

    setZoom(Math.max(0.25, Math.min(3, Number(nextZoom.toFixed(3)))));
  };

  return (
    <section className="panel-surface flex min-h-0 flex-col overflow-hidden p-4 md:min-h-[520px] lg:h-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55 dark:text-ink-light/55">{t("workspace.title")}</div>
          <div className="mt-1 text-lg font-semibold text-ink dark:text-ink-light">{t("workspace.subtitle")}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyZoomPreset("fit-width")}
            disabled={!page}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
          >
            {t("workspace.fitWidth")}
          </button>
          <button
            type="button"
            onClick={() => applyZoomPreset("fit-page")}
            disabled={!page}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
          >
            {t("workspace.fitPage")}
          </button>
          <button
            type="button"
            onClick={() => applyZoomPreset("actual")}
            disabled={!page}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
          >
            100%
          </button>
          <div aria-live="polite" className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink/60 dark:bg-white/5 dark:text-ink-light/55">
            {t("workspace.zoomLabel", { percent: Math.round(zoom * 100) })}
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-stretch justify-center rounded-[28px] border border-dashed border-ink/10 bg-[linear-gradient(180deg,_rgba(255,253,248,0.8)_0%,_rgba(230,238,245,0.8)_100%)] p-6 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(15,25,35,0.8)_0%,_rgba(18,28,40,0.8)_100%)]">
        <div
          ref={viewportFrameRef}
          data-testid="workspace-viewport"
          className="relative flex min-h-[460px] w-full items-start justify-center overflow-auto rounded-[24px] bg-[#dbe3ea] p-3 sm:p-6 md:p-8 dark:bg-[#1a2636]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.12),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(184,92,56,0.08),_transparent_24%)] dark:bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.08),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(232,133,95,0.06),_transparent_24%)]" />
          {documentLoadState === "loading" ? (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-60 w-40" />
              {documentLoadProgress !== null && Number.isFinite(documentLoadProgress) ? (
                <div className="text-sm font-medium text-ink/60 dark:text-ink-light/55">
                  {Math.round(documentLoadProgress)}%
                </div>
              ) : null}
            </div>
          ) : null}
          {documentLoadState === "ready" && documentProxy && page ? (
            <div className="relative z-10">
              <PdfPageCanvas
                documentProxy={documentProxy}
                pageIndex={currentPageIndex}
                zoom={zoom}
              >
                <div ref={cropLayerRef} data-testid="crop-layer" className="absolute inset-0">
                  <CropOverlay onPointerDown={startCreate} />
                  {viewport && cropRect ? (
                    <CropRectangle
                      cropRect={cropRect}
                      viewport={viewport}
                      snapGuides={snapGuides}
                      onMoveStart={startMove}
                      onResizeStart={startResize}
                    />
                  ) : null}
                  {viewport &&
                  activeDragState.pageIndex === currentPageIndex &&
                  draftCropRect ? (
                    <CropDimensionsTooltip
                      cropRect={draftCropRect}
                      viewport={viewport}
                    />
                  ) : null}
                </div>
              </PdfPageCanvas>
              <div aria-live="polite" className="absolute right-5 top-5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white dark:bg-ink-light dark:text-mist-dark">
                {t("workspace.pageBadge", { page: currentPageIndex + 1 })}
              </div>
            </div>
          ) : null}
          {documentLoadState !== "loading" && (!documentProxy || !page) ? (
            <div className="relative rounded-[18px] bg-white/75 px-6 py-4 text-sm text-ink/60 dark:bg-white/5 dark:text-ink-light/55">
              {t("workspace.emptyState")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
