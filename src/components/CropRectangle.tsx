import { memo, type PointerEvent as ReactPointerEvent } from "react";
import { pdfRectToCanvasRect, pdfToCanvasPoint, type ViewportMetrics } from "@/utils/coordinates";
import type { CropHandle, CropRect, SnapGuide } from "@/types";

interface CropRectangleProps {
  cropRect: CropRect;
  viewport: ViewportMetrics;
  snapGuides: SnapGuide[];
  onMoveStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeStart: (handle: CropHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
}

const HANDLE_POSITIONS: Array<{
  handle: CropHandle;
  className: string;
  cursor: string;
}> = [
  { handle: "nw", className: "-left-2.5 -top-2.5", cursor: "cursor-nwse-resize" },
  { handle: "n", className: "left-1/2 -top-2.5 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { handle: "ne", className: "-right-2.5 -top-2.5", cursor: "cursor-nesw-resize" },
  { handle: "e", className: "-right-2.5 top-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
  { handle: "se", className: "-bottom-2.5 -right-2.5", cursor: "cursor-nwse-resize" },
  { handle: "s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", cursor: "cursor-ns-resize" },
  { handle: "sw", className: "-bottom-2.5 -left-2.5", cursor: "cursor-nesw-resize" },
  { handle: "w", className: "-left-2.5 top-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
];

export const CropRectangle = memo(function CropRectangle({
  cropRect,
  viewport,
  snapGuides,
  onMoveStart,
  onResizeStart,
}: CropRectangleProps) {
  const canvasRect = pdfRectToCanvasRect(cropRect, viewport);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {snapGuides.map((guide) => {
        if (guide.orientation === "vertical") {
          const point = pdfToCanvasPoint({ x: guide.position, y: 0 }, viewport);

          return (
            <div
              key={`v-${guide.position}`}
              className="absolute bottom-0 top-0 border-l border-dashed border-sky"
              style={{ left: `${point.x}px` }}
            />
          );
        }

        const point = pdfToCanvasPoint({ x: 0, y: guide.position }, viewport);

        return (
          <div
            key={`h-${guide.position}`}
            className="absolute left-0 right-0 border-t border-dashed border-sky"
            style={{ top: `${point.y}px` }}
          />
        );
      })}

      <div
        data-testid="crop-rectangle"
        onPointerDown={onMoveStart}
        className="pointer-events-auto absolute rounded-[18px] border-2 border-dashed border-ember bg-ember/10"
        style={{
          left: `${canvasRect.x}px`,
          top: `${canvasRect.y}px`,
          width: `${canvasRect.width}px`,
          height: `${canvasRect.height}px`,
          boxShadow: "0 0 0 9999px rgba(24, 34, 48, 0.2)",
        }}
      >
        <div className="absolute inset-0 cursor-move rounded-[16px]" />
        {HANDLE_POSITIONS.map(({ handle, className, cursor }) => (
          <div
            key={handle}
            onPointerDown={(event) => onResizeStart(handle, event)}
            className={`pointer-events-auto absolute h-5 w-5 rounded-full border-2 border-white bg-sky shadow-md ${className} ${cursor}`}
          />
        ))}
      </div>
    </div>
  );
});
