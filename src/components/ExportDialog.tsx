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
  const [progressLabel, setProgressLabel] = useState("正在准备导出...");
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
    setProgressLabel("正在准备导出...");
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
    setProgressLabel("导出已取消。");
  };

  const startExport = async () => {
    if (!fileBuffer) {
      setErrorMessage("请先打开 PDF 再导出。");
      return;
    }

    if (exportMode === "redraw" && redrawBlocked) {
      setErrorMessage(
        `当前选中的旋转裁剪页（${rotatedCroppedPages
          .map((page) => page.pageIndex + 1)
          .join(", ")}）暂不支持重绘导出，请改用 Crop box 模式。`,
      );
      return;
    }

    const nextDownloadName = normalizeDownloadName(downloadName, fileName, exportMode);
    const hasInvalidCrop = targetPageIndices.some((pageIndex) => {
      const cropRect = pageCrops[pageIndex]?.cropRect;
      return Boolean(cropRect) && (cropRect!.width <= 0 || cropRect!.height <= 0);
    });

    if (hasInvalidCrop) {
      setErrorMessage("存在无效裁剪框，请调整后再导出。");
      return;
    }

    setErrorMessage(null);
    setExportInProgress(true);
    setDownloadName(nextDownloadName);
    setProgressPercent(0);
    setProgressLabel("正在准备导出...");

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
            ? "正在保存最终 PDF..."
            : `正在处理第 ${response.payload.completedPages} / ${response.payload.totalPages} 页...`,
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
      setProgressLabel("导出完成。");
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
      setErrorMessage("导出任务执行失败。");
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
            <div className="text-xs uppercase tracking-[0.22em] text-ink/45">导出</div>
            <div className="mt-2 text-2xl font-semibold text-ink">生成新的 PDF 文件</div>
            <div className="mt-2 text-sm text-ink/60">
              {scopedCroppedPageCount > 0
                ? `当前导出范围内有 ${scopedCroppedPageCount} 页已经设置裁剪。`
                : "当前导出范围没有裁剪设置，导出结果会保持原始页面。"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !exportInProgress && setExportDialogOpen(false)}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={exportInProgress}
          >
            关闭
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              导出范围
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  value: "current",
                  label: "当前页",
                  description: `仅导出第 ${currentPageIndex + 1} 页。`,
                },
                {
                  value: "selected",
                  label: "选中页",
                  description: `当前已选 ${selectedTargets.length} 页。`,
                },
                {
                  value: "all",
                  label: "全部页面",
                  description: `整份文档共 ${pages.length} 页。`,
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
              检测到旋转裁剪页：
              {rotatedCroppedPages.map((page) => page.pageIndex + 1).join("、")}。当前选择下
              `Redraw` 导出已禁用，因为现有重绘链路还不能安全映射 90°/270° 页面的坐标。
            </div>
          ) : null}
          <label className="block">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              文件名
            </div>
            <input
              value={downloadName}
              onChange={(event) => setDownloadName(event.target.value)}
              className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky"
            />
          </label>

          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              导出模式
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
                  速度更快，只修改页面的 crop/media box，不重绘页面内容。
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
                  以裁剪框大小重建新页面，更适合后续打印或继续处理。
                </div>
                {redrawBlocked ? (
                  <div className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-amber-900">
                    旋转裁剪页暂不支持
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
            {exportInProgress ? "取消导出" : "取消"}
          </button>
          <button
            type="button"
            onClick={startExport}
            disabled={exportInProgress}
            className="rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ember/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportInProgress ? "导出中..." : "导出 PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
