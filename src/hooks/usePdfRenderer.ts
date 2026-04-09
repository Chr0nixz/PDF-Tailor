import { useEffect, useRef, useState } from "react";
import i18n from "@/i18n/i18n";
import {
  loadPdfJs,
  type OnProgressParameters,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "@/lib/pdfjs";
import { usePdfStore } from "@/store/usePdfStore";
import { useToastStore } from "@/store/useToastStore";
import type { PageMetadata } from "@/types";

function getDocumentErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "PasswordException") {
      return i18n.t("errors.passwordProtected");
    }

    if (error.name === "InvalidPDFException") {
      return i18n.t("errors.invalidPdf");
    }

    return error.message;
  }

  return i18n.t("errors.cannotLoadPdf");
}

async function readPageMetadata(document: PDFDocumentProxy): Promise<PageMetadata[]> {
  const numPages = document.numPages;
  const pages = new Array<PageMetadata>(numPages);

  // Process in batches of 5 to parallelize loading without overwhelming pdf.js.
  const batchSize = 5;
  for (let batchStart = 1; batchStart <= numPages; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, numPages);
    const batchPromises = Array.from({ length: batchEnd - batchStart + 1 }, async (_, i) => {
      const pageNumber = batchStart + i;
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const meta: PageMetadata = {
        sourceId: pageNumber - 1,
        pageIndex: pageNumber - 1, // kept for backwards compat -- alias of sourceId
        widthPt: viewport.width,
        heightPt: viewport.height,
        rotation: page.rotate,
        userRotation: 0,
      };
      page.cleanup();
      return meta;
    });

    const batchResults = await Promise.all(batchPromises);
    for (let i = 0; i < batchResults.length; i++) {
      pages[batchStart - 1 + i] = batchResults[i];
    }
  }

  return pages as PageMetadata[];
}

export function usePdfRenderer() {
  const fileBuffer = usePdfStore((state) => state.fileBuffer);
  const setPages = usePdfStore((state) => state.setPages);
  const setDocumentLoadState = usePdfStore((state) => state.setDocumentLoadState);
  const addToast = useToastStore((state) => state.addToast);

  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const [documentProxy, setDocumentProxy] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;

    const destroyCurrentDocument = async () => {
      const pendingTask = loadingTaskRef.current;
      loadingTaskRef.current = null;

      if (pendingTask) {
        await pendingTask.destroy().catch(() => undefined);
      }

      const pendingDocument = documentRef.current;
      documentRef.current = null;

      if (pendingDocument) {
        await pendingDocument.destroy().catch(() => undefined);
      }
    };

    const loadDocument = async () => {
      await destroyCurrentDocument();
      setDocumentProxy(null);

      if (!fileBuffer) {
        setPages([]);
        setDocumentLoadState("idle");
        return;
      }

      setDocumentLoadState("loading", 0);

      try {
        const pdfjs = await loadPdfJs();

        if (cancelled) {
          return;
        }

        // pdf.js may transfer typed-array ownership to the worker, so clone it
        // before loading and keep the original bytes in the store for export.
        const loadingTask = pdfjs.getDocument({ data: fileBuffer.slice() });
        loadingTaskRef.current = loadingTask;
        loadingTask.onProgress = (progress: OnProgressParameters) => {
          if (!cancelled) {
            setDocumentLoadState("loading", progress.percent);
          }
        };

        const nextDocument = await loadingTask.promise;

        if (cancelled) {
          await nextDocument.destroy().catch(() => undefined);
          return;
        }

        const pages = await readPageMetadata(nextDocument);

        if (cancelled) {
          await nextDocument.destroy().catch(() => undefined);
          return;
        }

        documentRef.current = nextDocument;
        setDocumentProxy(nextDocument);
        setPages(pages);
        setDocumentLoadState("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPages([]);
        setDocumentLoadState("error");
        addToast({ type: "error", message: getDocumentErrorMessage(error) });
        setDocumentProxy(null);
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
      void destroyCurrentDocument();
    };
  }, [fileBuffer, setDocumentLoadState, addToast, setPages]);

  return {
    documentProxy,
  };
}
