/// <reference lib="webworker" />

import { exportPdf } from "@/utils/pdfOperations";
import type { ExportWorkerRequest, ExportWorkerResponse } from "@/workers/workerTypes";

const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = async (event: MessageEvent<ExportWorkerRequest>) => {
  if (event.data.type !== "EXPORT_PDF") {
    return;
  }

  try {
    const fileBuffer = await exportPdf(event.data.payload);
    const generation = event.data.generation;

    const response: ExportWorkerResponse = {
      type: "EXPORT_SUCCESS",
      payload: { fileBuffer },
      generation,
    };

    worker.postMessage(response, [fileBuffer.buffer as ArrayBuffer]);
  } catch (error) {
    const response: ExportWorkerResponse = {
      type: "EXPORT_ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Unknown export error",
      },
      generation: event.data.generation,
    };

    worker.postMessage(response);
  }
};
