import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { usePdfStore } from "@/store/usePdfStore";
import {
  canvasToPdfPoint,
  clampRectToPage,
  createCropRectFromPoints,
  screenToCanvasPoint,
  type ViewportMetrics,
} from "@/utils/coordinates";
import { snapRect } from "@/utils/snapEngine";
import type { CropHandle, CropRect } from "@/types";

const MIN_CROP_SIZE_PT = 12;
const SNAP_THRESHOLD_PX = 5;

interface UseCropSelectionOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  viewport: ViewportMetrics | null;
  pageIndex: number;
  pageWidthPt: number;
  pageHeightPt: number;
  cropRect: CropRect | null;
}

interface DragSession {
  startPoint: { x: number; y: number };
  initialRect: CropRect | null;
  pointerOffset: { x: number; y: number };
  handle: CropHandle | "create";
  action: "create" | "move" | "resize";
}

function clampMoveRect(rect: CropRect, pageWidthPt: number, pageHeightPt: number) {
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, 0), Math.max(0, pageWidthPt - rect.width)),
    y: Math.min(Math.max(rect.y, 0), Math.max(0, pageHeightPt - rect.height)),
  };
}

function getResizeHandleForCreate(
  startPoint: { x: number; y: number },
  currentPoint: { x: number; y: number },
): CropHandle {
  const vertical = currentPoint.y >= startPoint.y ? "n" : "s";
  const horizontal = currentPoint.x >= startPoint.x ? "e" : "w";
  return `${vertical}${horizontal}` as CropHandle;
}

export function useCropSelection({
  containerRef,
  viewport,
  pageIndex,
  pageWidthPt,
  pageHeightPt,
  cropRect,
}: UseCropSelectionOptions) {
  const beginCropInteraction = usePdfStore((state) => state.beginCropInteraction);
  const updateDraftCrop = usePdfStore((state) => state.updateDraftCrop);
  const endCropInteraction = usePdfStore((state) => state.endCropInteraction);
  const clearCropInteraction = usePdfStore((state) => state.clearCropInteraction);
  const draftCropRect = usePdfStore((state) => state.draftCropRect);
  const activeDragState = usePdfStore((state) => state.activeDragState);
  const activeSnapGuides = usePdfStore((state) => state.activeSnapGuides);

  const sessionRef = useRef<DragSession | null>(null);
  const hasPointerDeltaRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const queuedRectRef = useRef<CropRect | null>(null);
  const queuedGuidesRef = useRef<typeof activeSnapGuides>([]);

  const effectiveCropRect =
    activeDragState.pageIndex === pageIndex && draftCropRect ? draftCropRect : cropRect;

  const queueDraftUpdate = useCallback(
    (nextRect: CropRect, guides: typeof activeSnapGuides) => {
      queuedRectRef.current = nextRect;
      queuedGuidesRef.current = guides;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;

        if (queuedRectRef.current) {
          updateDraftCrop(queuedRectRef.current, queuedGuidesRef.current);
        }
      });
    },
    [updateDraftCrop],
  );

  const eventToPdfPoint = useCallback(
    (event: PointerEvent | ReactPointerEvent) => {
      if (!containerRef.current || !viewport) {
        return null;
      }

      const bounds = containerRef.current.getBoundingClientRect();
      const canvasPoint = screenToCanvasPoint(event.clientX, event.clientY, bounds);

      return canvasToPdfPoint(canvasPoint, viewport);
    },
    [containerRef, viewport],
  );

  const buildDraftRect = useCallback(
    (point: { x: number; y: number }) => {
      const session = sessionRef.current;

      if (!session) {
        return null;
      }

      const snapThresholdPt = viewport ? SNAP_THRESHOLD_PX / viewport.scale : 0;

      if (session.action === "create") {
        const handle = getResizeHandleForCreate(session.startPoint, point);
        const rawRect = createCropRectFromPoints(session.startPoint, point, pageIndex);
        const snapped = snapRect({
          rect: rawRect,
          pageWidth: pageWidthPt,
          pageHeight: pageHeightPt,
          threshold: snapThresholdPt,
          mode: "create",
          handle,
        });

        return {
          rect: clampRectToPage(snapped.rect, pageWidthPt, pageHeightPt, MIN_CROP_SIZE_PT),
          guides: snapped.guides,
        };
      }

      if (session.action === "move" && session.initialRect) {
        const movedRect = clampMoveRect(
          {
            ...session.initialRect,
            x: point.x - session.pointerOffset.x,
            y: point.y - session.pointerOffset.y,
          },
          pageWidthPt,
          pageHeightPt,
        );

        const snapped = snapRect({
          rect: movedRect,
          pageWidth: pageWidthPt,
          pageHeight: pageHeightPt,
          threshold: snapThresholdPt,
          mode: "move",
          handle: "move",
        });

        return {
          rect: clampMoveRect(snapped.rect, pageWidthPt, pageHeightPt),
          guides: snapped.guides,
        };
      }

      if (session.action === "resize" && session.initialRect) {
        let left = session.initialRect.x;
        let right = session.initialRect.x + session.initialRect.width;
        let bottom = session.initialRect.y;
        let top = session.initialRect.y + session.initialRect.height;

        if (session.handle.includes("w")) {
          left = Math.min(point.x, right - MIN_CROP_SIZE_PT);
        }

        if (session.handle.includes("e")) {
          right = Math.max(point.x, left + MIN_CROP_SIZE_PT);
        }

        if (session.handle.includes("n")) {
          top = Math.max(point.y, bottom + MIN_CROP_SIZE_PT);
        }

        if (session.handle.includes("s")) {
          bottom = Math.min(point.y, top - MIN_CROP_SIZE_PT);
        }

        const resizedRect: CropRect = {
          pageIndex,
          x: left,
          y: bottom,
          width: right - left,
          height: top - bottom,
        };

        const snapped = snapRect({
          rect: resizedRect,
          pageWidth: pageWidthPt,
          pageHeight: pageHeightPt,
          threshold: snapThresholdPt,
          mode: "resize",
          handle: session.handle,
        });

        return {
          rect: clampRectToPage(snapped.rect, pageWidthPt, pageHeightPt, MIN_CROP_SIZE_PT),
          guides: snapped.guides,
        };
      }

      return null;
    },
    [pageHeightPt, pageIndex, pageWidthPt, viewport],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const nextPoint = eventToPdfPoint(event);

      if (!nextPoint) {
        return;
      }

      const nextDraft = buildDraftRect(nextPoint);

      if (!nextDraft) {
        return;
      }

      const session = sessionRef.current;

      if (session) {
        const movedEnough =
          Math.abs(nextPoint.x - session.startPoint.x) > 1 ||
          Math.abs(nextPoint.y - session.startPoint.y) > 1;
        hasPointerDeltaRef.current = hasPointerDeltaRef.current || movedEnough;
      }

      queueDraftUpdate(nextDraft.rect, nextDraft.guides);
    },
    [buildDraftRect, eventToPdfPoint, queueDraftUpdate],
  );

  const finishInteraction = useCallback(
    (commit: boolean) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (queuedRectRef.current) {
        updateDraftCrop(queuedRectRef.current, queuedGuidesRef.current);
      }

      if (commit) {
        endCropInteraction(true);
      } else {
        clearCropInteraction();
      }

      sessionRef.current = null;
      hasPointerDeltaRef.current = false;
      queuedRectRef.current = null;
      queuedGuidesRef.current = [];
    },
    [clearCropInteraction, endCropInteraction, handlePointerMove, updateDraftCrop],
  );

  const handlePointerUp = useCallback(
    (_event: PointerEvent) => {
      finishInteraction(hasPointerDeltaRef.current);
    },
    [finishInteraction],
  );

  const startInteraction = useCallback(
    (
      event: ReactPointerEvent,
      action: "create" | "move" | "resize",
      handle: CropHandle | "create",
      sourceRect: CropRect | null,
    ) => {
      const startPoint = eventToPdfPoint(event);

      if (!startPoint || !viewport) {
        return;
      }

      const baseRect = sourceRect ?? cropRect;

      sessionRef.current = {
        startPoint,
        initialRect: baseRect,
        pointerOffset: baseRect
          ? {
              x: startPoint.x - baseRect.x,
              y: startPoint.y - baseRect.y,
            }
          : { x: 0, y: 0 },
        handle,
        action,
      };
      hasPointerDeltaRef.current = false;

      beginCropInteraction(pageIndex, action, handle === "create" ? null : handle);

      if (action === "create") {
        updateDraftCrop(
          {
            pageIndex,
            x: startPoint.x,
            y: startPoint.y,
            width: MIN_CROP_SIZE_PT,
            height: MIN_CROP_SIZE_PT,
          },
          [],
        );
      } else if (baseRect) {
        updateDraftCrop(baseRect, []);
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [
      beginCropInteraction,
      cropRect,
      eventToPdfPoint,
      handlePointerMove,
      handlePointerUp,
      pageIndex,
      updateDraftCrop,
      viewport,
    ],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handlePointerMove, handlePointerUp]);

  return {
    cropRect: effectiveCropRect,
    snapGuides: activeDragState.pageIndex === pageIndex ? activeSnapGuides : [],
    isInteracting: activeDragState.pageIndex === pageIndex,
    startCreate: (event: ReactPointerEvent) => {
      event.preventDefault();
      startInteraction(event, "create", "create", null);
    },
    startMove: (event: ReactPointerEvent) => {
      if (!effectiveCropRect) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      startInteraction(event, "move", "move", effectiveCropRect);
    },
    startResize: (handle: CropHandle, event: ReactPointerEvent) => {
      if (!effectiveCropRect) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      startInteraction(event, "resize", handle, effectiveCropRect);
    },
  };
}
