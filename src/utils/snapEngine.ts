export interface SnapGuide {
  orientation: "horizontal" | "vertical";
  position: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
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
