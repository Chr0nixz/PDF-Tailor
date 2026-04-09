import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  loadPdfJs,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
} from "@/lib/pdfjs";
import { usePdfStore } from "@/store/usePdfStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { getRotatedCroppedPages, formatRotatedPagesList } from "@/utils/documentWarnings";
import type { ExportMode } from "@/types";
import type { ExportWorkerResponse } from "@/workers/workerTypes";
import { fitScale } from "@/utils/scale";

export function PreviewModal() {
  const { t } = useTranslation();
  const previewOpen = usePdfStore((state) => state.previewOpen);
  const fileBuffer = usePdfStore((state) => state.fileBuffer);
  const fileName = usePdfStore((state) => state.fileName);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const pages = usePdfStore((state) => state.pages);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const setPreviewOpen = usePdfStore((state) => state.setPreviewOpen);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const previewDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const previewGenerationRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, previewOpen);

  const [previewMode, setPreviewMode] = useState<ExportMode>("crop-box");
  const [previewPageIndex, setPreviewPageIndex] = useState(currentPageIndex);
  const [pageCount, setPageCount] = useState(0);
  const [previewDocumentReady, setPreviewDocumentReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const croppedPageCount = useMemo(
    () => Object.values(pageCrops).filter((pageCrop) => Boolean(pageCrop.cropRect)).length,
    [pageCrops],
  );
  const rotatedCroppedPages = useMemo(
    () => getRotatedCroppedPages(pages, pageCrops),
    [pageCrops, pages],
  );
  const redrawBlocked = rotatedCroppedPages.length > 0;
  const rotatedList = useMemo(
    () => formatRotatedPagesList(rotatedCroppedPages),
    [rotatedCroppedPages],
  );

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    setPreviewMode("crop-box");
    setPreviewPageIndex(currentPageIndex);
    setPreviewError(null);
    setPreviewDocumentReady(false);
  }, [previewOpen, currentPageIndex]);

  useEffect(() => {
    if (previewMode === "redraw" && redrawBlocked) {
      setPreviewMode("crop-box");
      setPreviewError(
        t("preview.rotatedCropWarning", { list: rotatedList }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, redrawBlocked, rotatedList]);

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen, setPreviewOpen]);

  useEffect(() => {
    let cancelled = false;

    const cleanupPreviewDocument = async () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;

      const loadingTask = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (loadingTask) {
        await loadingTask.destroy().catch(() => undefined);
      }

      const previewDocument = previewDocumentRef.current;
      previewDocumentRef.current = null;
      if (previewDocument) {
        await previewDocument.destroy().catch(() => undefined);
      }
    };

    const buildPreview = async () => {
      if (!previewOpen) {
        await cleanupPreviewDocument();
        return;
      }

      if (!fileBuffer) {
        setPreviewError(t("preview.pleaseOpenPdfFirst"));
        return;
      }

      const buildGeneration = previewGenerationRef.current + 1;
      previewGenerationRef.current = buildGeneration;

      setLoading(true);
      setPreviewError((value) =>
        value?.startsWith(t("preview.rotatedCropWarning", { list: "" }).slice(0, 20)) ? value : null,
      );
      setPreviewDocumentReady(false);
      await cleanupPreviewDocument();

      workerRef.current?.terminate();

      const worker = new Worker(
        new URL("../workers/pdfExportWorker.ts", import.meta.url),
        { type: "module" },
      );

      workerRef.current = worker;

      worker.onmessage = async (event: MessageEvent<ExportWorkerResponse>) => {
        if (cancelled || event.data.generation !== buildGeneration) {
          worker.terminate();
          return;
        }

        const response = event.data;

        if (response.type === "EXPORT_PROGRESS") {
          return;
        }

        worker.terminate();
        workerRef.current = null;

        if (response.type === "EXPORT_ERROR") {
          setLoading(false);
          setPreviewError(response.payload.message);
          return;
        }

        try {
          const pdfjs = await loadPdfJs();
          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(response.payload.fileBuffer),
          });
          loadingTaskRef.current = loadingTask;
          const previewDocument = await loadingTask.promise;

          if (cancelled) {
            await previewDocument.destroy().catch(() => undefined);
            return;
          }

          previewDocumentRef.current = previewDocument;
          setPageCount(previewDocument.numPages);
          setPreviewPageIndex((value) => Math.min(value, previewDocument.numPages - 1));
          setPreviewDocumentReady(true);
          setLoading(false);
        } catch (error) {
          setLoading(false);
          setPreviewError(error instanceof Error ? error.message : t("preview.failedToLoad"));
        }
      };

      worker.onerror = () => {
        setLoading(false);
        worker.terminate();
        workerRef.current = null;
        setPreviewError(t("preview.taskFailed"));
      };

      worker.postMessage({
        type: "EXPORT_PDF",
        payload: {
          fileBuffer,
          pageCrops,
          exportMode: previewMode,
          exportPageIndices: pages.map((page) => page.pageIndex),
        },
        generation: buildGeneration,
      });
    };

    void buildPreview();

    return () => {
      cancelled = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      void cleanupPreviewDocument();
    };
  }, [fileBuffer, pageCrops, pages, previewMode, previewOpen, t]);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      const previewDocument = previewDocumentRef.current;
      const canvas = canvasRef.current;

      if (!previewOpen || !previewDocument || !canvas) {
        return;
      }

      setRendering(true);
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;

      try {
        const page = await previewDocument.getPage(previewPageIndex + 1);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: fitScale(baseViewport.width, baseViewport.height),
        });
        const outputScale = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error(t("preview.noCanvasContext"));
        }

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvas: null,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;
        page.cleanup();

        if (!cancelled) {
          setRendering(false);
        }
      } catch (error) {
        if (
          cancelled ||
          (error instanceof Error && error.name === "RenderingCancelledException")
        ) {
          return;
        }

        setRendering(false);
        setPreviewError(error instanceof Error ? error.message : t("preview.renderFailed"));
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [previewOpen, previewPageIndex, pageCount, previewDocumentReady, t]);

  if (!previewOpen) {
    return null;
  }

  return (
    <div
      data-testid="preview-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-dialog-title"
      className="absolute inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-8 backdrop-blur-sm dark:bg-mist-dark/50"
    >
      <div ref={dialogRef} className="panel-surface flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div id="preview-dialog-title" className="text-xs uppercase tracking-[0.22em] text-ink/45 dark:text-ink-light/45">{t("preview.title")}</div>
            <div className="mt-2 text-2xl font-semibold text-ink dark:text-ink-light">{fileName ?? t("preview.title")}</div>
            <div className="mt-2 text-sm text-ink/60 dark:text-ink-light/55">
              {croppedPageCount > 0
                ? t("preview.croppedInfo", { count: croppedPageCount })
                : t("preview.noCropInfo")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/20"
            data-testid="preview-dialog-close"
          >
            {t("header.close")}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {redrawBlocked ? (
            <div className="w-full rounded-[18px] border border-amber-300/60 bg-amber-100/65 px-4 py-3 text-sm leading-6 text-amber-950">
              {t("preview.rotatedCropWarningAlt", { list: formatRotatedPagesList(rotatedCroppedPages, "、") })}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setPreviewMode("crop-box")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              previewMode === "crop-box"
                ? "bg-ink text-white dark:bg-ink-light dark:text-mist-dark"
                : "border border-ink/10 bg-white/80 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
            }`}
          >
            Crop box
          </button>
          <button
            type="button"
            onClick={() => {
              if (redrawBlocked) {
                return;
              }
              setPreviewMode("redraw");
            }}
            disabled={redrawBlocked}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              previewMode === "redraw"
                ? "bg-ink text-white dark:bg-ink-light dark:text-mist-dark"
                : "border border-ink/10 bg-white/80 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Redraw
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewPageIndex((value) => Math.max(0, value - 1))}
              disabled={previewPageIndex <= 0 || loading}
              className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("preview.noPrevPage")}
            </button>
            <div className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-ink">
              {pageCount > 0 ? `${previewPageIndex + 1} / ${pageCount}` : "0 / 0"}
            </div>
            <button
              type="button"
              onClick={() =>
                setPreviewPageIndex((value) => Math.min(pageCount - 1, value + 1))
              }
              disabled={pageCount === 0 || previewPageIndex >= pageCount - 1 || loading}
              className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("preview.nextPage")}
            </button>
          </div>
        </div>

        <div className="mt-6 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-[28px] border border-dashed border-ink/10 bg-[linear-gradient(180deg,_rgba(255,253,248,0.84)_0%,_rgba(230,238,245,0.84)_100%)] p-6 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(15,25,35,0.84)_0%,_rgba(18,28,40,0.84)_100%)]">
          {loading ? (
            <div className="rounded-[18px] bg-white/80 px-6 py-4 text-sm text-ink/70 dark:bg-white/5 dark:text-ink-light/55">
              {t("preview.generating")}
            </div>
          ) : previewError ? (
            <div className="rounded-[18px] border border-ember/20 bg-ember/10 px-6 py-4 text-sm text-ember dark:border-ember-dark/20 dark:bg-ember-dark/10 dark:text-ember-dark">
              {previewError}
            </div>
          ) : (
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="block rounded-[20px] border border-ink/10 bg-paper shadow-[0_24px_60px_rgba(24,34,48,0.12)] dark:border-white/10 dark:bg-paper-dark dark:shadow-none"
              />
              {rendering ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-paper/80 text-sm font-medium text-ink/60 dark:bg-paper-dark/80 dark:text-ink-light/55">
                  {t("preview.rendering")}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
