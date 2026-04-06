import { useMemo, useRef } from "react";
import { CropOverlay } from "@/components/CropOverlay";
import { CropRectangle } from "@/components/CropRectangle";
import { PdfPageCanvas } from "@/components/PdfPageCanvas";
import { useCropSelection } from "@/hooks/useCropSelection";
import { usePdfStore } from "@/store/usePdfStore";
import { selectCurrentPageCrop } from "@/store/selectors";
import type { ViewportMetrics } from "@/utils/coordinates";
import type { PDFDocumentProxy } from "@/lib/pdfjs";

interface WorkspaceProps {
  documentProxy: PDFDocumentProxy | null;
}

export function Workspace({ documentProxy }: WorkspaceProps) {
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
    <section className="panel-surface flex min-h-0 min-h-[520px] flex-col overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Workspace</div>
          <div className="mt-1 text-lg font-semibold">Current page canvas</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyZoomPreset("fit-width")}
            disabled={!page}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Fit width
          </button>
          <button
            type="button"
            onClick={() => applyZoomPreset("fit-page")}
            disabled={!page}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Fit page
          </button>
          <button
            type="button"
            onClick={() => applyZoomPreset("actual")}
            disabled={!page}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            100%
          </button>
          <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink/60">
            Zoom {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-stretch justify-center rounded-[28px] border border-dashed border-ink/10 bg-[linear-gradient(180deg,_rgba(255,253,248,0.8)_0%,_rgba(230,238,245,0.8)_100%)] p-6">
        <div
          ref={viewportFrameRef}
          className="relative flex min-h-[460px] w-full items-start justify-center overflow-auto rounded-[24px] bg-[#dbe3ea] p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.12),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(184,92,56,0.08),_transparent_24%)]" />
          {documentLoadState === "loading" ? (
            <div className="relative rounded-[18px] bg-white/75 px-6 py-4 text-center text-sm text-ink/70">
              Loading PDF...
              {documentLoadProgress !== null ? (
                <div className="mt-2 font-medium">
                  {Number.isFinite(documentLoadProgress)
                    ? `${Math.round(documentLoadProgress)}%`
                    : "Preparing pages"}
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
                <div ref={cropLayerRef} className="absolute inset-0">
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
                </div>
              </PdfPageCanvas>
              <div className="absolute right-5 top-5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
                Page {currentPageIndex + 1}
              </div>
            </div>
          ) : null}
          {documentLoadState !== "loading" && (!documentProxy || !page) ? (
            <div className="relative rounded-[18px] bg-white/75 px-6 py-4 text-sm text-ink/60">
              Open a PDF to render the current page here.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
