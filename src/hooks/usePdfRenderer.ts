import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  type OnProgressParameters,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "@/lib/pdfjs";
import { usePdfStore } from "@/store/usePdfStore";
import type { PageMetadata } from "@/types";

function getDocumentErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "PasswordException") {
      return "Password-protected PDFs are not supported yet.";
    }

    if (error.name === "InvalidPDFException") {
      return "The selected file is not a valid PDF document.";
    }

    return error.message;
  }

  return "Unable to load the selected PDF document.";
}

async function readPageMetadata(document: PDFDocumentProxy): Promise<PageMetadata[]> {
  const pages: PageMetadata[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });

    pages.push({
      pageIndex: pageNumber - 1,
      widthPt: viewport.width,
      heightPt: viewport.height,
      rotation: page.rotate,
    });

    page.cleanup();
  }

  return pages;
}

export function usePdfRenderer() {
  const fileBuffer = usePdfStore((state) => state.fileBuffer);
  const setPages = usePdfStore((state) => state.setPages);
  const setDocumentLoadState = usePdfStore((state) => state.setDocumentLoadState);
  const setErrorMessage = usePdfStore((state) => state.setErrorMessage);

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
        setErrorMessage(null);
        return;
      }

      setErrorMessage(null);
      setDocumentLoadState("loading", 0);

      try {
        // pdf.js may transfer typed-array ownership to the worker, so clone it
        // before loading and keep the original bytes in the store for export.
        const loadingTask = getDocument({ data: fileBuffer.slice() });
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
        setErrorMessage(getDocumentErrorMessage(error));
        setDocumentProxy(null);
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
      void destroyCurrentDocument();
    };
  }, [fileBuffer, setDocumentLoadState, setErrorMessage, setPages]);

  return {
    documentProxy,
  };
}
