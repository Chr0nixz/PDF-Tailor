import type { CropRect, CropHandle, SnapGuide } from "@/types";

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export interface SnapRectResult {
  rect: CropRect;
  guides: SnapGuide[];
}

function findClosestTarget(value: number, targets: number[], threshold: number) {
  let closestDelta = Number.POSITIVE_INFINITY;
  let closestTarget: number | null = null;

  for (const target of targets) {
    const delta = Math.abs(target - value);

    if (delta <= threshold && delta < closestDelta) {
      closestDelta = delta;
      closestTarget = target;
    }
  }

  return closestTarget;
}

export function snapPoint({
  x,
  y,
  pageWidth,
  pageHeight,
  threshold,
}: {
  x: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  threshold: number;
}): SnapResult {
  const guides: SnapGuide[] = [];
  let nextX = x;
  let nextY = y;

  const verticalTargets = [0, pageWidth / 2, pageWidth];
  const horizontalTargets = [0, pageHeight / 2, pageHeight];

  for (const target of verticalTargets) {
    if (Math.abs(target - x) <= threshold) {
      nextX = target;
      guides.push({ orientation: "vertical", position: target });
      break;
    }
  }

  for (const target of horizontalTargets) {
    if (Math.abs(target - y) <= threshold) {
      nextY = target;
      guides.push({ orientation: "horizontal", position: target });
      break;
    }
  }

  return {
    x: nextX,
    y: nextY,
    guides,
  };
}

function snapMoveAxis(
  start: number,
  size: number,
  pageExtent: number,
  threshold: number,
  orientation: "horizontal" | "vertical",
) {
  const end = start + size;
  const center = start + size / 2;
  const pageCenter = pageExtent / 2;
  const edgeTargets = [0, pageCenter, pageExtent];
  const candidates: Array<{
    delta: number;
    start: number;
    guide: SnapGuide;
  }> = [];

  const startTarget = findClosestTarget(start, edgeTargets, threshold);
  if (startTarget !== null) {
    candidates.push({
      delta: Math.abs(startTarget - start),
      start: startTarget,
      guide: {
        orientation,
        position: startTarget,
      },
    });
  }

  const endTarget = findClosestTarget(end, edgeTargets, threshold);
  if (endTarget !== null) {
    candidates.push({
      delta: Math.abs(endTarget - end),
      start: endTarget - size,
      guide: {
        orientation,
        position: endTarget,
      },
    });
  }

  const centerTarget = findClosestTarget(center, [pageCenter], threshold);
  if (centerTarget !== null) {
    candidates.push({
      delta: Math.abs(centerTarget - center),
      start: centerTarget - size / 2,
      guide: {
        orientation,
        position: centerTarget,
      },
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((leftCandidate, rightCandidate) => leftCandidate.delta - rightCandidate.delta);

  return {
    start: candidates[0].start,
    guide: candidates[0].guide,
  };
}

function snapResizeAxis(
  edgeValue: number,
  pageExtent: number,
  threshold: number,
  orientation: "horizontal" | "vertical",
) {
  const targets = [0, pageExtent / 2, pageExtent];
  const target = findClosestTarget(edgeValue, targets, threshold);

  if (target === null) {
    return null;
  }

  return {
    value: target,
    guide: {
      orientation,
      position: target,
    } satisfies SnapGuide,
  };
}

export function snapRect({
  rect,
  pageWidth,
  pageHeight,
  threshold,
  mode,
  handle,
}: {
  rect: CropRect;
  pageWidth: number;
  pageHeight: number;
  threshold: number;
  mode: "create" | "move" | "resize";
  handle: CropHandle | "create";
}): SnapRectResult {
  const guides: SnapGuide[] = [];
  let left = rect.x;
  let right = rect.x + rect.width;
  let bottom = rect.y;
  let top = rect.y + rect.height;

  if (mode === "move") {
    const xSnap = snapMoveAxis(left, rect.width, pageWidth, threshold, "vertical");
    const ySnap = snapMoveAxis(bottom, rect.height, pageHeight, threshold, "horizontal");

    if (xSnap) {
      left = xSnap.start;
      right = left + rect.width;
      guides.push(xSnap.guide);
    }

    if (ySnap) {
      bottom = ySnap.start;
      top = bottom + rect.height;
      guides.push(ySnap.guide);
    }
  } else {
    const moveLeft = handle === "create" || handle.includes("w");
    const moveRight = handle === "create" || handle.includes("e");
    const moveTop = handle === "create" || handle.includes("n");
    const moveBottom = handle === "create" || handle.includes("s");

    if (moveLeft) {
      const snapped = snapResizeAxis(left, pageWidth, threshold, "vertical");
      if (snapped) {
        left = snapped.value;
        guides.push(snapped.guide);
      }
    }

    if (moveRight) {
      const snapped = snapResizeAxis(right, pageWidth, threshold, "vertical");
      if (snapped) {
        right = snapped.value;
        guides.push(snapped.guide);
      }
    }

    if (moveTop) {
      const snapped = snapResizeAxis(top, pageHeight, threshold, "horizontal");
      if (snapped) {
        top = snapped.value;
        guides.push(snapped.guide);
      }
    }

    if (moveBottom) {
      const snapped = snapResizeAxis(bottom, pageHeight, threshold, "horizontal");
      if (snapped) {
        bottom = snapped.value;
        guides.push(snapped.guide);
      }
    }
  }

  return {
    rect: {
      pageIndex: rect.pageIndex,
      x: left,
      y: bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, top - bottom),
    },
    guides,
  };
}
