import type { WorkerExportPayload } from "@/types";

export async function prepareExportPayload(
  payload: WorkerExportPayload,
): Promise<WorkerExportPayload> {
  return payload;
}
