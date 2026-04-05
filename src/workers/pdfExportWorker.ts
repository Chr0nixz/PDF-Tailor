/// <reference lib="webworker" />

import type { ExportWorkerRequest, ExportWorkerResponse } from "@/workers/workerTypes";

const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = async (event: MessageEvent<ExportWorkerRequest>) => {
  if (event.data.type !== "EXPORT_PDF") {
    return;
  }

  try {
    const { fileBuffer } = event.data.payload;

    const response: ExportWorkerResponse = {
      type: "EXPORT_SUCCESS",
      payload: { fileBuffer },
    };

    worker.postMessage(response, [fileBuffer.buffer as ArrayBuffer]);
  } catch (error) {
    const response: ExportWorkerResponse = {
      type: "EXPORT_ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Unknown export error",
      },
    };

    worker.postMessage(response);
  }
};
