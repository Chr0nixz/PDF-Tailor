import type { WorkerExportPayload } from "@/types";

export type ExportWorkerRequest = {
  type: "EXPORT_PDF";
  payload: WorkerExportPayload;
  generation: number;
};

export type ExportWorkerResponse =
  | {
      type: "EXPORT_SUCCESS";
      payload: { fileBuffer: Uint8Array };
      generation: number;
    }
  | {
      type: "EXPORT_ERROR";
      payload: { message: string };
      generation: number;
    };
