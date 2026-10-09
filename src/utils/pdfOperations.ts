import i18n from "@/i18n/i18n";
import { degrees, PDFDocument } from "pdf-lib";
import type { CropRect, PageCropState, WorkerExportPayload } from "@/types";
import { normalizeRotation } from "@/utils/documentWarnings";
import { splitCropRect } from "@/utils/columnSplit";

interface ExportProgressEvent {
  completedPages: number;
  totalPages: number;
  stage: "processing" | "saving";
}

interface ExportPdfOptions {
  onProgress?: (event: ExportProgressEvent) => void;
}

function getValidCropRect(pageCrop: PageCropState | undefined): CropRect | null {
  const cropRect = pageCrop?.cropRect;

  if (!cropRect) {
    return null;
  }

  if (cropRect.width <= 0 || cropRect.height <= 0) {
    throw new Error(i18n.t("errors.invalidCropDimensions", { page: cropRect.pageIndex + 1 }));
  }

  return cropRect;
}

async function exportWithCropBoxes(payload: WorkerExportPayload) {
  return exportWithCropBoxesAndProgress(payload);
}

function getTargetPageIndices(payload: WorkerExportPayload, totalPages: number) {
  const requestedIndices = payload.exportPageIndices;

  if (!requestedIndices || requestedIndices.length === 0) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const seen = new Set<number>();
  const validIndices: number[] = [];

  for (const pageIndex of requestedIndices) {
    if (pageIndex >= 0 && pageIndex < totalPages && !seen.has(pageIndex)) {
      seen.add(pageIndex);
      validIndices.push(pageIndex);
    }
  }

  return validIndices;
}

async function exportWithCropBoxesAndProgress(
  payload: WorkerExportPayload,
  options?: ExportPdfOptions,
) {
  const sourceDoc = await PDFDocument.load(payload.fileBuffer);
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();
  const targetPageIndices = getTargetPageIndices(payload, sourcePages.length);

  for (let index = 0; index < targetPageIndices.length; index += 1) {
    const sourcePageIndex = targetPageIndices[index];
    const pageCrop = payload.pageCrops[sourcePageIndex];
    const cropRect = getValidCropRect(pageCrop);
    const segments = cropRect ? splitCropRect(cropRect, pageCrop?.splitConfig) : [null];

    for (const segment of segments) {
      const [copiedPage] = await outputDoc.copyPages(sourceDoc, [sourcePageIndex]);
      if (segment) {
        copiedPage.setCropBox(segment.x, segment.y, segment.width, segment.height);
        copiedPage.setMediaBox(segment.x, segment.y, segment.width, segment.height);
      }
      outputDoc.addPage(copiedPage);
    }

    options?.onProgress?.({
      completedPages: index + 1,
      totalPages: targetPageIndices.length,
      stage: "processing",
    });
  }

  options?.onProgress?.({
    completedPages: targetPageIndices.length,
    totalPages: targetPageIndices.length,
    stage: "saving",
  });

  return new Uint8Array(await outputDoc.save());
}

function clampBox(
  box: { left: number; bottom: number; right: number; top: number },
  maxWidth: number,
  maxHeight: number,
) {
  const left = Math.max(0, Math.min(maxWidth, box.left));
  const bottom = Math.max(0, Math.min(maxHeight, box.bottom));
  const right = Math.max(left, Math.min(maxWidth, box.right));
  const top = Math.max(bottom, Math.min(maxHeight, box.top));
  return { left, bottom, right, top };
}

export function computeRedrawConfig(
  cropRect: CropRect,
  originalWidth: number,
  originalHeight: number,
  rotationAngle: number,
) {
  const normRotation = normalizeRotation(rotationAngle);
  const w = Math.max(1, cropRect.width);
  const h = Math.max(1, cropRect.height);

  if (normRotation === 90) {
    return {
      boundingBox: clampBox(
        {
          left: originalWidth - cropRect.y - h,
          bottom: cropRect.x,
          right: originalWidth - cropRect.y,
          top: cropRect.x + w,
        },
        originalWidth,
        originalHeight,
      ),
      drawOptions: {
        x: 0,
        y: h,
        width: h,
        height: w,
        rotate: degrees(270),
      },
      pageSize: [w, h] as [number, number],
    };
  }

  if (normRotation === 180) {
    return {
      boundingBox: clampBox(
        {
          left: originalWidth - cropRect.x - w,
          bottom: originalHeight - cropRect.y - h,
          right: originalWidth - cropRect.x,
          top: originalHeight - cropRect.y,
        },
        originalWidth,
        originalHeight,
      ),
      drawOptions: {
        x: w,
        y: h,
        width: w,
        height: h,
        rotate: degrees(180),
      },
      pageSize: [w, h] as [number, number],
    };
  }

  if (normRotation === 270) {
    return {
      boundingBox: clampBox(
        {
          left: cropRect.y,
          bottom: originalHeight - cropRect.x - w,
          right: cropRect.y + h,
          top: originalHeight - cropRect.x,
        },
        originalWidth,
        originalHeight,
      ),
      drawOptions: {
        x: w,
        y: 0,
        width: h,
        height: w,
        rotate: degrees(90),
      },
      pageSize: [w, h] as [number, number],
    };
  }

  // 0 degrees default
  return {
    boundingBox: clampBox(
      {
        left: cropRect.x,
        bottom: cropRect.y,
        right: cropRect.x + w,
        top: cropRect.y + h,
      },
      originalWidth,
      originalHeight,
    ),
    drawOptions: {
      x: 0,
      y: 0,
      width: w,
      height: h,
    },
    pageSize: [w, h] as [number, number],
  };
}

async function exportWithRedraw(payload: WorkerExportPayload, options?: ExportPdfOptions) {
  const sourceDoc = await PDFDocument.load(payload.fileBuffer);
  const outputDoc = await PDFDocument.create();
  const sourcePages = sourceDoc.getPages();
  const targetPageIndices = getTargetPageIndices(payload, sourcePages.length);

  for (let index = 0; index < targetPageIndices.length; index += 1) {
    const pageIndex = targetPageIndices[index];
    const pageCrop = payload.pageCrops[pageIndex];
    const cropRect = getValidCropRect(pageCrop);
    const sourcePage = sourcePages[pageIndex];
    const rotation = sourcePage?.getRotation().angle ?? 0;

    if (!cropRect) {
      const [copiedPage] = await outputDoc.copyPages(sourceDoc, [pageIndex]);
      outputDoc.addPage(copiedPage);
      options?.onProgress?.({
        completedPages: index + 1,
        totalPages: targetPageIndices.length,
        stage: "processing",
      });
      continue;
    }

    const originalWidth = sourcePage.getWidth();
    const originalHeight = sourcePage.getHeight();
    const segments = splitCropRect(cropRect, pageCrop?.splitConfig);

    for (const segment of segments) {
      const redrawConfig = computeRedrawConfig(
        segment,
        originalWidth,
        originalHeight,
        rotation,
      );

      try {
        const embeddedPage = await outputDoc.embedPage(
          sourcePage,
          redrawConfig.boundingBox,
        );

        const nextPage = outputDoc.addPage(redrawConfig.pageSize);
        nextPage.drawPage(embeddedPage, redrawConfig.drawOptions);
      } catch (embedError) {
        if (
          embedError instanceof Error &&
          embedError.message.includes("missing Contents")
        ) {
          const [fallbackPage] = await outputDoc.copyPages(sourceDoc, [pageIndex]);
          fallbackPage.setCropBox(segment.x, segment.y, segment.width, segment.height);
          fallbackPage.setMediaBox(segment.x, segment.y, segment.width, segment.height);
          outputDoc.addPage(fallbackPage);
        } else {
          throw embedError;
        }
      }
    }

    options?.onProgress?.({
      completedPages: index + 1,
      totalPages: targetPageIndices.length,
      stage: "processing",
    });
  }

  options?.onProgress?.({
    completedPages: targetPageIndices.length,
    totalPages: targetPageIndices.length,
    stage: "saving",
  });

  return new Uint8Array(await outputDoc.save());
}

export async function exportPdf(
  payload: WorkerExportPayload,
  options?: ExportPdfOptions,
): Promise<Uint8Array> {
  if (payload.exportMode === "redraw") {
    return exportWithRedraw(payload, options);
  }

  return exportWithCropBoxesAndProgress(payload, options);
}
