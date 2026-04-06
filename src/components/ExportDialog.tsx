import { useEffect, useMemo, useRef, useState } from "react";
import { usePdfStore } from "@/store/usePdfStore";
import { getRotatedCroppedPages } from "@/utils/documentWarnings";
import type { ExportMode, ExportScope } from "@/types";
import type { ExportWorkerResponse } from "@/workers/workerTypes";

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
  const setErrorMessage = usePdfStore((state) => state.setErrorMessage);

  const [exportMode, setExportMode] = useState<ExportMode>("crop-box");
  const [exportScope, setExportScope] = useState<ExportScope>("all");
  const [downloadName, setDownloadName] = useState(buildDownloadName(fileName, "crop-box"));
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparing export...");
  const workerRef = useRef<Worker | null>(null);
  const exportGenerationRef = useRef(0);

  const selectedTargets = selectedPageIndices.length > 0 ? selectedPageIndices : [currentPageIndex];
  const targetPageIndices = useMemo(() => {
    if (exportScope === "current") {
      return [currentPageIndex];
    }

    if (exportScope === "selected") {
      return selectedTargets;
    }

    return pages.map((page) => page.pageIndex);
  }, [currentPageIndex, exportScope, pages, selectedTargets]);
  const croppedPageCount = useMemo(
    () => Object.values(pageCrops).filter((pageCrop) => Boolean(pageCrop.cropRect)).length,
    [pageCrops],
  );
  const rotatedCroppedPages = useMemo(
    () =>
      getRotatedCroppedPages(pages, pageCrops).filter((page) =>
        targetPageIndices.includes(page.pageIndex),
      ),
    [pageCrops, pages, targetPageIndices],
  );
  const redrawBlocked = rotatedCroppedPages.length > 0;
  const scopedCroppedPageCount = useMemo(
    () =>
      targetPageIndices.filter((pageIndex) => Boolean(pageCrops[pageIndex]?.cropRect)).length,
    [pageCrops, targetPageIndices],
  );

  useEffect(() => {
    if (!exportDialogOpen) {
      return;
    }

    setExportMode("crop-box");
    setExportScope("all");
    setDownloadName(buildDownloadName(fileName, "crop-box"));
    setProgressPercent(0);
    setProgressLabel("Preparing export...");
  }, [exportDialogOpen, fileName]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!exportDialogOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !exportInProgress) {
        setExportDialogOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exportDialogOpen, exportInProgress, setExportDialogOpen]);

  if (!exportDialogOpen) {
    return null;
  }

  const cancelExport = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setExportInProgress(false);
    setProgressPercent(0);
    setProgressLabel("Export cancelled.");
  };

  const startExport = async () => {
    if (!fileBuffer) {
      setErrorMessage("Open a PDF before exporting.");
      return;
    }

    if (exportMode === "redraw" && redrawBlocked) {
      setErrorMessage(
        `Redraw export is not available while cropped rotated pages are selected (${rotatedCroppedPages
          .map((page) => page.pageIndex + 1)
          .join(", ")}). Use Crop box mode instead.`,
      );
      return;
    }

    const nextDownloadName = normalizeDownloadName(downloadName, fileName, exportMode);
    const hasInvalidCrop = targetPageIndices.some((pageIndex) => {
      const cropRect = pageCrops[pageIndex]?.cropRect;
      return Boolean(cropRect) && (cropRect!.width <= 0 || cropRect!.height <= 0);
    });

    if (hasInvalidCrop) {
      setErrorMessage("One or more crop rectangles are invalid. Adjust the crop and try again.");
      return;
    }

    setErrorMessage(null);
    setExportInProgress(true);
    setDownloadName(nextDownloadName);
    setProgressPercent(0);
    setProgressLabel("Preparing export...");

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
        const basePercent =
          response.payload.stage === "saving"
            ? 95
            : Math.round((response.payload.completedPages / totalPages) * 90);
        setProgressPercent((current) => Math.max(current, basePercent));
        setProgressLabel(
          response.payload.stage === "saving"
            ? "Saving final PDF..."
            : `Processing pages ${response.payload.completedPages} / ${response.payload.totalPages}...`,
        );
        return;
      }

      setExportInProgress(false);
      worker.terminate();
      workerRef.current = null;

      if (response.type === "EXPORT_ERROR") {
        setProgressPercent(0);
        setErrorMessage(response.payload.message);
        return;
      }

      setProgressPercent(100);
      setProgressLabel("Export complete.");
      const normalizedBytes = new Uint8Array(response.payload.fileBuffer);
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
      setExportDialogOpen(false);
    };

    worker.onerror = () => {
      setExportInProgress(false);
      worker.terminate();
      workerRef.current = null;
      setProgressPercent(0);
      setErrorMessage("Export worker failed.");
    };

    worker.postMessage({
      type: "EXPORT_PDF",
      payload: {
        fileBuffer,
        pageCrops,
        exportMode,
        exportPageIndices: targetPageIndices,
      },
      generation,
    });
  };

  return (
    <div
      data-testid="export-dialog"
      className="absolute inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 py-8 backdrop-blur-sm"
    >
      <div className="panel-surface w-full max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-ink/45">Export PDF</div>
            <div className="mt-2 text-2xl font-semibold text-ink">Generate a new file</div>
            <div className="mt-2 text-sm text-ink/60">
              {scopedCroppedPageCount > 0
                ? `${scopedCroppedPageCount} page(s) in this export scope currently have crop settings.`
                : "No crop settings found in this export scope. Export will keep the original pages unchanged."}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !exportInProgress && setExportDialogOpen(false)}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={exportInProgress}
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              Export range
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  value: "current",
                  label: "Current page",
                  description: `Only page ${currentPageIndex + 1}.`,
                },
                {
                  value: "selected",
                  label: "Selected pages",
                  description: `${selectedTargets.length} page(s) currently selected.`,
                },
                {
                  value: "all",
                  label: "All pages",
                  description: `${pages.length} total page(s).`,
                },
              ].map((scope) => (
                <button
                  key={scope.value}
                  type="button"
                  onClick={() => setExportScope(scope.value as ExportScope)}
                  className={`rounded-[20px] border px-4 py-4 text-left transition ${
                    exportScope === scope.value
                      ? "border-sky bg-sky/10"
                      : "border-ink/10 bg-white/75 hover:border-ink/20"
                  }`}
                >
                  <div className="text-sm font-semibold text-ink">{scope.label}</div>
                  <div className="mt-1 text-sm leading-6 text-ink/60">{scope.description}</div>
                </button>
              ))}
            </div>
          </div>
          {redrawBlocked ? (
            <div className="rounded-[18px] border border-amber-300/60 bg-amber-100/65 px-4 py-3 text-sm leading-6 text-amber-950">
              Rotated cropped pages detected on page {rotatedCroppedPages.length > 1 ? "s" : ""}{" "}
              {rotatedCroppedPages.map((page) => page.pageIndex + 1).join(", ")}. `Redraw`
              export is disabled for this selection because the current redraw pipeline does not
              safely remap 90/270 degree page coordinates yet.
            </div>
          ) : null}
          <label className="block">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              File name
            </div>
            <input
              value={downloadName}
              onChange={(event) => setDownloadName(event.target.value)}
              className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky"
            />
          </label>

          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              Export mode
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setExportMode("crop-box");
                  setDownloadName(buildDownloadName(fileName, "crop-box"));
                }}
                className={`rounded-[20px] border px-4 py-4 text-left transition ${
                  exportMode === "crop-box"
                    ? "border-sky bg-sky/10"
                    : "border-ink/10 bg-white/75 hover:border-ink/20"
                }`}
              >
                <div className="text-sm font-semibold text-ink">Crop box</div>
                <div className="mt-1 text-sm leading-6 text-ink/60">
                  Fast export. Updates the page crop and media boxes without redrawing content.
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (redrawBlocked) {
                    return;
                  }
                  setExportMode("redraw");
                  setDownloadName(buildDownloadName(fileName, "redraw"));
                }}
                disabled={redrawBlocked}
                className={`rounded-[20px] border px-4 py-4 text-left transition ${
                  exportMode === "redraw"
                    ? "border-sky bg-sky/10"
                    : "border-ink/10 bg-white/75 hover:border-ink/20"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="text-sm font-semibold text-ink">Redraw</div>
                <div className="mt-1 text-sm leading-6 text-ink/60">
                  Creates new pages using the crop rectangle as the final page size.
                </div>
                {redrawBlocked ? (
                  <div className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-900">
                    Disabled for rotated cropped pages
                  </div>
                ) : null}
              </button>
            </div>
          </div>
          {exportInProgress ? (
            <div className="rounded-[18px] border border-ink/10 bg-white/80 px-4 py-4">
              <div className="flex items-center justify-between gap-3 text-sm font-medium text-ink">
                <span>{progressLabel}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full bg-ember transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => (exportInProgress ? cancelExport() : setExportDialogOpen(false))}
            className="rounded-full border border-ink/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportInProgress ? "Cancel export" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={startExport}
            disabled={exportInProgress}
            className="rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ember/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportInProgress ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
