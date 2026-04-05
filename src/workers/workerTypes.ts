import type { WorkerExportPayload } from "@/types";

export type ExportWorkerRequest = {
  type: "EXPORT_PDF";
  payload: WorkerExportPayload;
};

export type ExportWorkerResponse =
  | {
      type: "EXPORT_SUCCESS";
      payload: { fileBuffer: Uint8Array };
    }
  | {
      type: "EXPORT_ERROR";
      payload: { message: string };
    };
