import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "@/lib/pdfjs";
import type { PageMetadata } from "@/types";

interface ThumbnailState {
  status: "idle" | "loading" | "ready" | "error";
  dataUrl: string | null;
}

type ThumbnailMap = Record<number, ThumbnailState>;

const THUMBNAIL_WIDTH = 156;

export function useThumbnails(
  documentProxy: PDFDocumentProxy | null,
  pages: PageMetadata[],
) {
  const [thumbnails, setThumbnails] = useState<ThumbnailMap>({});
  const thumbnailsRef = useRef<ThumbnailMap>({});
  const inflightRef = useRef<Set<number>>(new Set());

  // Keep ref in sync with state
  thumbnailsRef.current = thumbnails;

  useEffect(() => {
    inflightRef.current.clear();
    thumbnailsRef.current = {};
    setThumbnails({});
  }, [documentProxy, pages.length]);

  const requestThumbnail = useCallback(
    async (pageIndex: number) => {
      if (!documentProxy) {
        return;
      }

      if (inflightRef.current.has(pageIndex)) {
        return;
      }

      const existing = thumbnailsRef.current[pageIndex];
      if (existing?.status === "ready" || existing?.status === "loading") {
        return;
      }

      inflightRef.current.add(pageIndex);
      setThumbnails((current) => ({
        ...current,
        [pageIndex]: {
          status: "loading",
          dataUrl: null,
        },
      }));

      try {
        const page = await documentProxy.getPage(pageIndex + 1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = THUMBNAIL_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Unable to create thumbnail canvas context.");
        }

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const renderTask = page.render({
          canvas: canvas as HTMLCanvasElement,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;
        const dataUrl = canvas.toDataURL("image/png");
        page.cleanup();

        setThumbnails((current) => ({
          ...current,
          [pageIndex]: {
            status: "ready",
            dataUrl,
          },
        }));
      } catch {
        setThumbnails((current) => ({
          ...current,
          [pageIndex]: {
            status: "error",
            dataUrl: null,
          },
        }));
      } finally {
        inflightRef.current.delete(pageIndex);
      }
    },
    [documentProxy],
  );

  return {
    thumbnails,
    requestThumbnail,
  };
}
