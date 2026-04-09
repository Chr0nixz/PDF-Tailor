import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "@/lib/pdfjs";
import type { PageMetadata } from "@/types";

interface ThumbnailState {
  status: "idle" | "loading" | "ready" | "error";
  dataUrl: string | null;
}

type ThumbnailMap = Record<number, ThumbnailState>;

const THUMBNAIL_WIDTH = 156;
const MAX_CACHED_THUMBNAILS = 30;
const ADJACENT_PREHEAT_COUNT = 1;

export function useThumbnails(
  documentProxy: PDFDocumentProxy | null,
  pages: PageMetadata[],
) {
  const [thumbnails, setThumbnails] = useState<ThumbnailMap>({});
  const thumbnailsRef = useRef<ThumbnailMap>({});
  const inflightRef = useRef<Set<number>>(new Set());
  /** LRU tracking: keys in order of most recently used (newest at end). */
  const lruOrderRef = useRef<number[]>([]);

  // Keep ref in sync with state
  thumbnailsRef.current = thumbnails;

  useEffect(() => {
    inflightRef.current.clear();
    thumbnailsRef.current = {};
    lruOrderRef.current = [];
    setThumbnails({});
  }, [documentProxy, pages.length]);

  /**
   * Evict least-recently-used thumbnails until the cache is within MAX_CACHED_THUMBNAILS.
   * We only evict entries that are already "ready" (loaded) to avoid disrupting in-flight work.
   */
  const evictLRU = useCallback(() => {
    const current = thumbnailsRef.current;
    const order = lruOrderRef.current;

    while (order.length > MAX_CACHED_THUMBNAILS && order.length > 0) {
      const oldest = order.shift()!;
      if (current[oldest]?.status === "ready") {
        const { [oldest]: _removed, ...rest } = current;
        thumbnailsRef.current = rest;
        setThumbnails(rest);
      }
    }
  }, []);

  /**
   * Move a key to the end of the LRU order (most recently used).
   */
  const touchKey = useCallback((key: number) => {
    const order = lruOrderRef.current;
    const idx = order.indexOf(key);
    if (idx !== -1) {
      order.splice(idx, 1);
    }
    order.push(key);
  }, []);

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
        touchKey(pageIndex);
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

        setThumbnails((current) => {
          const next: ThumbnailMap = {
            ...current,
            [pageIndex]: {
              status: "ready",
              dataUrl,
            },
          };
          thumbnailsRef.current = next;
          touchKey(pageIndex);
          evictLRU();
          return next;
        });
      } catch {
        setThumbnails((current) => {
          const next: ThumbnailMap = {
            ...current,
            [pageIndex]: {
              status: "error",
              dataUrl: null,
            },
          };
          thumbnailsRef.current = next;
          touchKey(pageIndex);
          return next;
        });
      } finally {
        inflightRef.current.delete(pageIndex);
      }
    },
    [documentProxy, touchKey, evictLRU],
  );

  /**
   * Preload adjacent thumbnails (±1) to make scrolling feel instant.
   */
  const requestAdjacent = useCallback(
    (centerIndex: number) => {
      const pageCount = pages.length;
      for (let offset = -ADJACENT_PREHEAT_COUNT; offset <= ADJACENT_PREHEAT_COUNT; offset++) {
        if (offset === 0) continue;
        const idx = centerIndex + offset;
        if (idx >= 0 && idx < pageCount) {
          const page = pages[idx];
          if (page) {
            requestThumbnail(page.sourceId);
          }
        }
      }
    },
    [pages, requestThumbnail],
  );

  return {
    thumbnails,
    requestThumbnail,
    requestAdjacent,
  };
}
