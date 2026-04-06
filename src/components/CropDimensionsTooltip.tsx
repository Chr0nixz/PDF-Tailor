import { useEffect, useState } from "react";
import type { CropRect } from "@/types";
import { pdfRectToCanvasRect, type ViewportMetrics } from "@/utils/coordinates";
import { formatUnit, ptToMm } from "@/utils/unitConversion";

interface CropDimensionsTooltipProps {
  cropRect: CropRect;
  viewport: ViewportMetrics;
}

export function CropDimensionsTooltip({
  cropRect,
  viewport,
}: CropDimensionsTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  const canvasRect = pdfRectToCanvasRect(cropRect, viewport);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed z-30 rounded-[14px] border border-ink/15 bg-ink/90 px-4 py-2.5 shadow-xl backdrop-blur-sm dark:border-white/15 dark:bg-ink-light/90"
      style={{
        left: `max(8px, ${canvasRect.x + canvasRect.width / 2}px)`,
        top: `${Math.max(8, canvasRect.y - 8)}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="whitespace-nowrap text-center text-[13px] font-semibold tabular-nums text-white dark:text-mist-dark">
        {Math.round(cropRect.width)} × {Math.round(cropRect.height)} pt
      </div>
      <div className="mt-0.5 whitespace-nowrap text-center text-[11px] text-white/60 dark:text-mist-dark/60">
        {formatUnit(ptToMm(cropRect.width), 1)} × {formatUnit(ptToMm(cropRect.height), 1)} mm
      </div>
      <div className="absolute left-1/2 top-full h-2 -translate-x-1/2 translate-y-[-2px]">
        <div className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-ink/90 dark:border-t-ink-light/90" />
      </div>
    </div>
  );
}
