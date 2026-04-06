import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "@/lib/pdfjs";

interface PdfPageCanvasProps {
  documentProxy: PDFDocumentProxy;
  pageIndex: number;
  zoom: number;
  children?: ReactNode;
}

interface CanvasSize {
  width: number;
  height: number;
}

export function PdfPageCanvas({
  documentProxy,
  pageIndex,
  zoom,
  children,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const pageRef = useRef<PDFPageProxy | null>(null);
  // Cache page instance to avoid cleanup+re-fetch on zoom changes
  const cachedPageKey = useRef<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      setRenderState("loading");

      renderTaskRef.current?.cancel();

      // Only cleanup and re-fetch page if key (doc+index) changed
      const pageKey = `${pageIndex}`;
      if (cachedPageKey.current !== pageKey || !pageRef.current) {
        pageRef.current?.cleanup();
        pageRef.current = null;
        cachedPageKey.current = null;

        try {
          const page = await documentProxy.getPage(pageIndex + 1);

          if (cancelled) {
            page.cleanup();
            return;
          }

          pageRef.current = page;
          cachedPageKey.current = pageKey;
        } catch (error) {
          if (cancelled) return;
          setRenderState("error");
          return;
        }
      }

      const page = pageRef.current;
      if (!page) {
        return;
      }

      try {
        const viewport = page.getViewport({ scale: zoom });
        const outputScale = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("2D canvas context is not available.");
        }

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setCanvasSize({
          width: viewport.width,
          height: viewport.height,
        });

        const transform =
          outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0];

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvas: null,
          canvasContext: context,
          viewport,
          transform,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (cancelled) {
          return;
        }

        setRenderState("ready");
      } catch (error) {
        if (
          cancelled ||
          (error instanceof Error && error.name === "RenderingCancelledException")
        ) {
          return;
        }

        setRenderState("error");
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      pageRef.current?.cleanup();
      pageRef.current = null;
    };
  }, [documentProxy, pageIndex, zoom]);

  return (
    <div
      data-testid="pdf-page-stage"
      className="relative overflow-hidden rounded-[20px] border border-ink/10 bg-paper shadow-[0_24px_60px_rgba(24,34,48,0.12)]"
      style={{
        width: canvasSize.width ? `${canvasSize.width}px` : "320px",
        minHeight: canvasSize.height ? `${canvasSize.height}px` : "420px",
      }}
    >
      <canvas ref={canvasRef} className="block max-w-full" />
      {children}
      {renderState === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-paper/80 text-sm font-medium text-ink/60">
          正在渲染页面...
        </div>
      ) : null}
      {renderState === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-paper/90 px-6 text-center text-sm font-medium text-ember">
          当前页面渲染失败。
        </div>
      ) : null}
    </div>
  );
}
