import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePdfStore } from "@/store/usePdfStore";
import { useToastStore } from "@/store/useToastStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { getRotatedCroppedPages, formatRotatedPagesList } from "@/utils/documentWarnings";
import type { ExportMode, ExportScope, PageNumberFormat, PageNumberPosition } from "@/types";
import type { ExportWorkerResponse } from "@/workers/workerTypes";
import { useThumbnails } from "@/hooks/useThumbnails";
import { savePdfDialog, writeFileFromUint8Array, openFileLocation, isTauriAvailable } from "@/utils/fileIO";

function buildDownloadName(fileName: string | null, mode: ExportMode) {
  const baseName = fileName?.replace(/\.pdf$/i, "") ?? "pdf-tailor-export";
  return `${baseName}-${mode}.pdf`;
}

function normalizeDownloadName(downloadName: string, fileName: string | null, mode: ExportMode) {
  const trimmed = downloadName.trim();

  if (!trimmed) {
    return buildDownloadName(fileName, mode);
  }

  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

export function ExportDialog() {
  const { t } = useTranslation();
  const fileName = usePdfStore((state) => state.fileName);
  const fileBuffer = usePdfStore((state) => state.fileBuffer);
  const pages = usePdfStore((state) => state.pages);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const selectedPageIndices = usePdfStore((state) => state.selectedPageIndices);
  const exportDialogOpen = usePdfStore((state) => state.exportDialogOpen);
  const exportInProgress = usePdfStore((state) => state.exportInProgress);
  const setExportDialogOpen = usePdfStore((state) => state.setExportDialogOpen);
  const setExportInProgress = usePdfStore((state) => state.setExportInProgress);
  const setLastExportSettings = usePdfStore((state) => state.setLastExportSettings);
  const lastExportScope = usePdfStore((state) => state.lastExportScope);
  const lastExportMode = usePdfStore((state) => state.lastExportMode);
  const addToast = useToastStore((state) => state.addToast);

  const [exportMode, setExportModeState] = useState<ExportMode>(lastExportMode);
  const [exportScope, setExportScopeState] = useState<ExportScope>(lastExportScope);
  const [downloadName, setDownloadName] = useState(buildDownloadName(fileName, lastExportMode));
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState(t("export.preparingExport"));
  const [exportRate, setExportRate] = useState<string | null>(null);
  const [exportEta, setExportEta] = useState<number | null>(null);
  const [paginationEnabled, setPaginationEnabled] = useState(false);
  const [paginationPosition, setPaginationPosition] = useState<PageNumberPosition>("bottom-center");
  const [paginationFormat, setPaginationFormat] = useState<PageNumberFormat>("page-n-of-total");
  const exportStartTimeRef = useRef<number>(0);
  function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const workerRef = useRef<Worker | null>(null);
  const exportGenerationRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, exportDialogOpen);

  // Preview page: first page in target indices
  const currentSourceId = pages[currentPageIndex]?.sourceId ?? currentPageIndex;
  const selectedTargets = selectedPageIndices.length > 0 ? selectedPageIndices : [currentSourceId];
  const targetPageIndices = useMemo(() => {
    if (exportScope === "current") {
      return [currentSourceId];
    }
    if (exportScope === "selected") {
      return selectedTargets;
    }
    return pages.map((page) => page.sourceId);
  }, [currentSourceId, exportScope, pages, selectedTargets]);

  const previewSourceId = targetPageIndices[0] ?? currentSourceId;
  const previewPage = pages.find((p) => p.sourceId === previewSourceId);
  const { thumbnails } = useThumbnails(
    null,
    previewPage ? [previewPage] : [],
  );
  const previewThumbnail = previewPage ? thumbnails[previewPage.sourceId] : null;

  const croppedPageCount = useMemo(
    () => Object.values(pageCrops).filter((pageCrop) => Boolean(pageCrop.cropRect)).length,
    [pageCrops],
  );
  const rotatedCroppedPages = useMemo(
    () =>
      getRotatedCroppedPages(pages, pageCrops).filter((page) =>
        targetPageIndices.includes(page.sourceId),
      ),
    [pageCrops, pages, targetPageIndices],
  );
  const redrawBlocked = rotatedCroppedPages.length > 0;
  const scopedCroppedPageCount = useMemo(
    () =>
      targetPageIndices.filter((pageIndex) => Boolean(pageCrops[pageIndex]?.cropRect)).length,
    [pageCrops, targetPageIndices],
  );
  const rotatedCropWarningList = useMemo(
    () => formatRotatedPagesList(rotatedCroppedPages, "、"),
    [rotatedCroppedPages],
  );

  // Estimated output pages
  const estimatedOutputPages = useMemo(() => {
    let total = 0;
    for (const idx of targetPageIndices) {
      const crop = pageCrops[idx];
      if (crop?.cropRect && crop.splitConfig && crop.splitConfig.direction !== "none") {
        if (crop.splitConfig.direction === "grid") {
          const r = Math.max(1, Math.min(4, crop.splitConfig.rows ?? 2));
          const c = Math.max(1, Math.min(4, crop.splitConfig.columns ?? 2));
          total += r * c;
        } else {
          total += 2;
        }
      } else {
        total += 1;
      }
    }
    return total;
  }, [pageCrops, targetPageIndices]);
  // Rough size estimate: original * (crop_ratio_estimate) * compression
  const estimatedSize = useMemo(() => {
    if (!fileBuffer || estimatedOutputPages === 0) return null;
    const scale = scopedCroppedPageCount > 0 ? 0.7 : 1.0;
    return new Blob([fileBuffer as BlobPart]).size * scale * (estimatedOutputPages / pages.length);
  }, [fileBuffer, scopedCroppedPageCount, estimatedOutputPages, pages.length]);

  const handleExportModeChange = (mode: ExportMode) => {
    setExportModeState(mode);
    setLastExportSettings(exportScope, mode);
    setDownloadName(buildDownloadName(fileName, mode));
  };

  const handleExportScopeChange = (scope: ExportScope) => {
    setExportScopeState(scope);
    setLastExportSettings(scope, exportMode);
  };

  useEffect(() => {
    if (!exportDialogOpen) return;

    setExportModeState(lastExportMode);
    setExportScopeState(lastExportScope);
    setDownloadName(buildDownloadName(fileName, lastExportMode));
    setProgressPercent(0);
    setProgressLabel(t("export.preparingExport"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportDialogOpen, fileName]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!exportDialogOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !exportInProgress) {
        setExportDialogOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exportDialogOpen, exportInProgress, setExportDialogOpen]);

  if (!exportDialogOpen) return null;

  const cancelExport = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setExportInProgress(false);
    setProgressPercent(0);
    setProgressLabel(t("export.exportCancelled"));
  };

  const startExport = async () => {
    if (!fileBuffer) {
      addToast({ type: "error", message: t("export.pleaseOpenPdfFirst") });
      return;
    }

    const nextDownloadName = normalizeDownloadName(downloadName, fileName, exportMode);
    const hasInvalidCrop = targetPageIndices.some((pageIndex) => {
      const cropRect = pageCrops[pageIndex]?.cropRect;
      return Boolean(cropRect) && (cropRect!.width <= 0 || cropRect!.height <= 0);
    });

    if (hasInvalidCrop) {
      addToast({ type: "error", message: t("export.invalidCropBox") });
      return;
    }

    setExportInProgress(true);
    setDownloadName(nextDownloadName);
    setProgressPercent(0);
    setProgressLabel(t("export.preparingExport"));
    setExportRate(null);
    setExportEta(null);
    exportStartTimeRef.current = Date.now();

    workerRef.current?.terminate();
    const generation = exportGenerationRef.current + 1;
    exportGenerationRef.current = generation;

    const worker = new Worker(
      new URL("../workers/pdfExportWorker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<ExportWorkerResponse>) => {
      if (event.data.generation !== generation) {
        worker.terminate();
        return;
      }

      const response = event.data;

      if (response.type === "EXPORT_PROGRESS") {
        const totalPages = Math.max(1, response.payload.totalPages);
        const completed = response.payload.completedPages;
        const basePercent =
          response.payload.stage === "saving"
            ? 95
            : Math.round((completed / totalPages) * 90);
        setProgressPercent((current) => Math.max(current, basePercent));
        setProgressLabel(
          response.payload.stage === "saving"
            ? t("export.savingFinalPdf")
            : t("export.exportingProgress", {
                current: completed,
                total: totalPages,
              }),
        );

        const elapsedSec = (Date.now() - exportStartTimeRef.current) / 1000;
        if (elapsedSec > 0.4 && completed > 0) {
          const rate = completed / elapsedSec;
          setExportRate(rate.toFixed(1));
          const remaining = Math.max(0, totalPages - completed);
          setExportEta(rate > 0 ? Math.ceil(remaining / rate) : null);
        }
        return;
      }

      setExportInProgress(false);
      worker.terminate();
      workerRef.current = null;

      if (response.type === "EXPORT_ERROR") {
        setProgressPercent(0);
        addToast({ type: "error", message: response.payload.message });
        return;
      }

      setProgressPercent(100);
      setProgressLabel(t("export.exportDone"));
      const normalizedBytes = new Uint8Array(response.payload.fileBuffer);

      if (isTauriAvailable()) {
        // Use native Tauri save dialog
        (async () => {
          const savePath = await savePdfDialog(nextDownloadName);
          if (savePath) {
            await writeFileFromUint8Array(savePath, normalizedBytes);
            addToast({ type: "success", message: t("export.exportDone") });
            // Offer to open the file location
            openFileLocation(savePath).catch(() => {});
          } else {
            // User cancelled - keep dialog open
            setExportDialogOpen(false);
            return;
          }
        })();
      } else {
        // Fallback to browser download
        const blob = new Blob([normalizedBytes], {
          type: "application/pdf",
        });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = objectUrl;
        anchor.download = nextDownloadName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      }
      setExportDialogOpen(false);
    };

    worker.onerror = () => {
      setExportInProgress(false);
      worker.terminate();
      workerRef.current = null;
      setProgressPercent(0);
      addToast({ type: "error", message: t("errors.exportFailed") });
    };

    worker.postMessage({
      type: "EXPORT_PDF",
      payload: {
        fileBuffer,
        pageCrops,
        exportMode,
        exportPageIndices: targetPageIndices,
        paginationConfig: paginationEnabled
          ? {
              enabled: true,
              position: paginationPosition,
              format: paginationFormat,
              fontSizePt: 9,
              marginPt: 18,
              startNumber: 1,
            }
          : undefined,
      },
      generation,
    });
  };

  return (
    <div
      data-testid="export-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      className="absolute inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 py-8 backdrop-blur-sm dark:bg-mist-dark/50"
    >
      <div ref={dialogRef} className="panel-surface w-full max-w-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div id="export-dialog-title" className="text-xs uppercase tracking-[0.22em] text-ink/45 dark:text-ink-light/45">{t("export.title")}</div>
            <div className="mt-2 text-2xl font-semibold text-ink dark:text-ink-light">{t("export.subtitle")}</div>
          </div>
          <button
            type="button"
            onClick={() => !exportInProgress && setExportDialogOpen(false)}
            disabled={exportInProgress}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
          >
            {t("header.close")}
          </button>
        </div>

        {/* Two-column layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
          {/* Left: Settings */}
          <div className="space-y-4">
            {/* Scope */}
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
                {t("export.scopeLabel")}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {([
                  { value: "current", label: t("export.currentPage"), desc: t("export.currentPageDesc", { page: currentPageIndex + 1 }) },
                  { value: "selected", label: t("export.selectedPages"), desc: t("export.selectedPagesDesc", { count: selectedTargets.length }) },
                  { value: "all", label: t("export.allPages"), desc: t("export.allPagesDesc", { count: pages.length }) },
                ] as const).map((scope) => (
                  <button
                    key={scope.value}
                    type="button"
                    onClick={() => handleExportScopeChange(scope.value)}
                    className={`rounded-[20px] border px-4 py-4 text-left transition ${
                      exportScope === scope.value
                        ? "border-sky bg-sky/10 dark:border-sky-dark dark:bg-sky-dark/10"
                        : "border-ink/10 bg-white/75 hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="text-sm font-semibold text-ink dark:text-ink-light">{scope.label}</div>
                    <div className="mt-1 text-sm leading-6 text-ink/60 dark:text-ink-light/55">{scope.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filename */}
            <label className="block">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
                {t("export.fileNameLabel")}
              </div>
              <input
                value={downloadName}
                onChange={(e) => setDownloadName(e.target.value)}
                className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:focus:border-sky-dark"
              />
            </label>

            {/* Export Mode */}
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
                {t("export.exportModeLabel")}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleExportModeChange("crop-box")}
                  className={`rounded-[20px] border px-4 py-4 text-left transition ${
                    exportMode === "crop-box"
                      ? "border-sky bg-sky/10 dark:border-sky-dark dark:bg-sky-dark/10"
                      : "border-ink/10 bg-white/75 hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-semibold text-ink dark:text-ink-light">Crop box</div>
                  <div className="mt-1 text-sm leading-6 text-ink/60 dark:text-ink-light/55">
                    {t("export.cropBoxDesc")}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportModeChange("redraw")}
                  className={`rounded-[20px] border px-4 py-4 text-left transition ${
                    exportMode === "redraw"
                      ? "border-sky bg-sky/10 dark:border-sky-dark dark:bg-sky-dark/10"
                      : "border-ink/10 bg-white/75 hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-semibold text-ink dark:text-ink-light">Redraw</div>
                  <div className="mt-1 text-sm leading-6 text-ink/60 dark:text-ink-light/55">
                    {t("export.redrawDesc")}
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
                    {t("export.paginationLabel")}
                  </div>
                  <div className="mt-0.5 text-xs text-ink/60 dark:text-ink-light/55">
                    {t("export.paginationDesc")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaginationEnabled(!paginationEnabled)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    paginationEnabled
                      ? "bg-pine text-white"
                      : "border border-ink/15 bg-white/80 text-ink dark:border-white/15 dark:bg-white/5 dark:text-ink-light"
                  }`}
                >
                  {paginationEnabled ? t("export.paginationOn") : t("export.paginationOff")}
                </button>
              </div>

              {paginationEnabled && (
                <div className="mt-3 space-y-2 border-t border-ink/8 pt-3 dark:border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-ink/50 dark:text-ink-light/50">
                        {t("export.paginationPosition")}
                      </label>
                      <select
                        value={paginationPosition}
                        onChange={(e) => setPaginationPosition(e.target.value as PageNumberPosition)}
                        className="w-full rounded-[12px] border border-ink/10 bg-white px-2 py-1.5 text-xs text-ink outline-none dark:border-white/10 dark:bg-panel-dark dark:text-ink-light"
                      >
                        <option value="bottom-center">{t("export.posBottomCenter")}</option>
                        <option value="bottom-right">{t("export.posBottomRight")}</option>
                        <option value="bottom-left">{t("export.posBottomLeft")}</option>
                        <option value="top-right">{t("export.posTopRight")}</option>
                        <option value="top-center">{t("export.posTopCenter")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-ink/50 dark:text-ink-light/50">
                        {t("export.paginationFormat")}
                      </label>
                      <select
                        value={paginationFormat}
                        onChange={(e) => setPaginationFormat(e.target.value as PageNumberFormat)}
                        className="w-full rounded-[12px] border border-ink/10 bg-white px-2 py-1.5 text-xs text-ink outline-none dark:border-white/10 dark:bg-panel-dark dark:text-ink-light"
                      >
                        <option value="page-n-of-total">Page 1 of {estimatedOutputPages}</option>
                        <option value="slash-total">1 / {estimatedOutputPages}</option>
                        <option value="number-only">1</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {exportInProgress && (
              <div className="rounded-[18px] border border-ink/10 bg-white/80 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3 text-sm font-medium text-ink dark:text-ink-light">
                  <span>{progressLabel}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-ember transition-[width] dark:bg-ember-dark"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {(exportRate !== null || (exportEta !== null && exportEta > 0)) && (
                  <div className="mt-2 flex items-center justify-between text-xs text-ink/60 dark:text-ink-light/55">
                    {exportRate !== null && (
                      <span>{t("export.speed", { rate: exportRate })}</span>
                    )}
                    {exportEta !== null && exportEta > 0 && (
                      <span>{t("export.eta", { seconds: exportEta })}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Mini preview + summary */}
          <div className="space-y-3">
            <div className="rounded-[20px] border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 text-center text-[10px] uppercase tracking-[0.2em] text-ink/45 dark:text-ink-light/45">
                {t("export.preview")}
              </div>
              <div className="subtle-grid flex aspect-[3/4] items-center justify-center rounded-[12px] border border-dashed border-ink/15 bg-panel dark:border-white/10 dark:bg-panel-dark">
                {previewThumbnail?.status === "ready" && previewThumbnail.dataUrl ? (
                  <img
                    src={previewThumbnail.dataUrl}
                    alt={previewPage ? t("thumbnail.altText", { page: previewPage.sourceId + 1 }) : ""}
                    className="max-h-full rounded-[8px] border border-ink/10 bg-paper object-contain shadow-sm dark:border-white/10 dark:bg-paper-dark dark:shadow-none"
                  />
                ) : (
                  <div className="text-center text-xs text-ink/45 dark:text-ink-light/45">
                    {previewPage ? `${Math.round(previewPage.widthPt)}×${Math.round(previewPage.heightPt)} pt` : "—"}
                  </div>
                )}
              </div>
              {previewPage && pageCrops[previewPage.sourceId]?.cropRect ? (
                <div className="mt-2 text-center text-[11px] text-ember dark:text-ember-dark">
                  {Math.round(pageCrops[previewPage.sourceId].cropRect!.width)}×{Math.round(pageCrops[previewPage.sourceId].cropRect!.height)} pt
                </div>
              ) : null}
            </div>

            {/* Export summary */}
            <div className="rounded-[20px] border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 text-center text-[10px] uppercase tracking-[0.2em] text-ink/45 dark:text-ink-light/45">
                {t("export.summary")}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink/55 dark:text-ink-light/55">{t("export.summaryOutputPages")}</span>
                  <span className="font-medium text-ink dark:text-ink-light">{estimatedOutputPages}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink/55 dark:text-ink-light/55">{t("export.summaryCroppedPages")}</span>
                  <span className="font-medium text-ink dark:text-ink-light">{scopedCroppedPageCount}</span>
                </div>
                {estimatedSize !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink/55 dark:text-ink-light/55">{t("export.summaryEstSize")}</span>
                    <span className="font-medium text-ink dark:text-ink-light">{formatBytes(estimatedSize)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => (exportInProgress ? cancelExport() : setExportDialogOpen(false))}
            className="rounded-full border border-ink/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
          >
            {exportInProgress ? t("export.cancelExport") : t("export.cancel")}
          </button>
          <button
            type="button"
            onClick={startExport}
            disabled={exportInProgress}
            className="rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ember/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-ember-dark dark:hover:bg-ember-dark/90"
          >
            {exportInProgress ? t("header.exporting") : t("export.exportPdf")}
          </button>
        </div>
      </div>
    </div>
  );
}
