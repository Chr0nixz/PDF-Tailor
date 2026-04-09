import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePdfStore } from "@/store/usePdfStore";
import type { PDFDocumentProxy, RenderTask } from "@/lib/pdfjs";

interface PrintPreviewProps {
  documentProxy: PDFDocumentProxy | null;
}

export function PrintPreview({ documentProxy }: PrintPreviewProps) {
  const { t } = useTranslation();
  const printPreviewOpen = usePdfStore((state) => state.printPreviewOpen);
  const setPrintPreviewOpen = usePdfStore((state) => state.setPrintPreviewOpen);
  const pages = usePdfStore((state) => state.pages);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const setCurrentPageIndex = usePdfStore((state) => state.setCurrentPage);

  const [previewPageIndex, setPreviewPageIndex] = useState(currentPageIndex);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const page = pages[previewPageIndex];

  useEffect(() => {
    if (printPreviewOpen) {
      setPreviewPageIndex(currentPageIndex);
    }
  }, [printPreviewOpen, currentPageIndex]);

  useEffect(() => {
    if (!printPreviewOpen || !documentProxy || !page || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    let cancelled = false;

    const render = async () => {
      renderTaskRef.current?.cancel();
      try {
        const pdfPage = await documentProxy.getPage(previewPageIndex + 1);
        if (cancelled) return;

        // Scale to fit nicely in preview (max 400pt width)
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const previewScale = Math.min(1, 400 / Math.max(baseViewport.width, baseViewport.height));
        const viewport = pdfPage.getViewport({ scale: previewScale });

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        const task = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = task;
        await task.promise;
        pdfPage.cleanup();
      } catch (error) {
        if (error instanceof Error && error.name !== "RenderingCancelledException") {
          console.error("PrintPreview render error:", error);
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [printPreviewOpen, documentProxy, previewPageIndex]);

  if (!printPreviewOpen) return null;

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Print Preview</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
          <img src="${dataUrl}" style="max-width:100%;max-height:100vh;" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
      className="absolute inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 py-8 backdrop-blur-sm"
    >
      <div className="panel-surface w-full max-w-2xl p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div id="print-preview-title" className="text-xs uppercase tracking-[0.22em] text-ink/45">
              {t("printPreview.title")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPrintPreviewOpen(false)}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink"
          >
            {t("header.close")}
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              const newIndex = Math.max(0, previewPageIndex - 1);
              setPreviewPageIndex(newIndex);
              setCurrentPageIndex(newIndex);
            }}
            disabled={previewPageIndex <= 0}
            className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← {t("preview.noPrevPage")}
          </button>
          <div className="text-sm text-ink/60">
            {previewPageIndex + 1} / {pages.length}
          </div>
          <button
            type="button"
            onClick={() => {
              const newIndex = Math.min(pages.length - 1, previewPageIndex + 1);
              setPreviewPageIndex(newIndex);
              setCurrentPageIndex(newIndex);
            }}
            disabled={previewPageIndex >= pages.length - 1}
            className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("preview.nextPage")} →
          </button>
        </div>

        <div className="flex items-center justify-center rounded-[28px] border border-dashed border-ink/10 bg-[linear-gradient(180deg,_rgba(255,253,248,0.9)_0%,_rgba(230,238,245,0.9)_100%)] p-8 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(15,25,35,0.9)_0%,_rgba(18,28,40,0.9)_100%)]">
          <div className="relative">
            {/* Paper shadow effect */}
            <div className="absolute -bottom-2 left-1/2 h-full w-full -translate-x-1/2 rounded-sm bg-ink/10 dark:bg-black/30" />
            {/* Paper background */}
            <div className="relative rounded-sm bg-white p-4 shadow-lg dark:bg-[#1a2636]">
              <canvas
                ref={canvasRef}
                className="block max-w-full"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!canvasRef.current}
            className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-ink-light dark:hover:bg-ink-light/90"
          >
            {t("printPreview.print")}
          </button>
        </div>
      </div>
    </div>
  );
}
