import { memo, type PointerEvent as ReactPointerEvent } from "react";
import { pdfRectToCanvasRect, pdfToCanvasPoint, type ViewportMetrics } from "@/utils/coordinates";
import type { ColumnSplitConfig, CropHandle, CropRect, ExclusionBands, SnapGuide } from "@/types";

interface CropRectangleProps {
  cropRect: CropRect;
  viewport: ViewportMetrics;
  snapGuides: SnapGuide[];
  splitConfig?: ColumnSplitConfig;
  exclusionBands?: ExclusionBands;
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
  splitConfig,
  exclusionBands,
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

        {splitConfig && splitConfig.direction === "vertical" && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 border-l-2 border-dashed border-pine"
            style={{ left: `${canvasRect.width * (splitConfig.splitRatio ?? 0.5)}px` }}
          >
            <div className="absolute -left-3.5 top-2 flex items-center justify-center rounded-full bg-pine px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              ①
            </div>
            <div className="absolute left-1 top-2 flex items-center justify-center rounded-full bg-pine px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              ②
            </div>
          </div>
        )}

        {splitConfig && splitConfig.direction === "horizontal" && (
          <div
            className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-pine"
            style={{ top: `${canvasRect.height * (1 - (splitConfig.splitRatio ?? 0.5))}px` }}
          >
            <div className="absolute left-2 -top-4 flex items-center justify-center rounded-full bg-pine px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              ①
            </div>
            <div className="absolute left-2 top-1 flex items-center justify-center rounded-full bg-pine px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              ②
            </div>
          </div>
        )}

        {splitConfig && splitConfig.direction === "grid" && (() => {
          const rows = Math.max(1, Math.min(4, splitConfig.rows ?? 2));
          const cols = Math.max(1, Math.min(4, splitConfig.columns ?? 2));
          const order = splitConfig.readingOrder ?? "ltr-ttb";
          const cellW = canvasRect.width / cols;
          const cellH = canvasRect.height / rows;

          const badges: { num: number; x: number; y: number }[] = [];
          let currentNum = 1;

          if (order === "ttb-ltr") {
            for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                badges.push({ num: currentNum++, x: c * cellW + 6, y: r * cellH + 6 });
              }
            }
          } else {
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                badges.push({ num: currentNum++, x: c * cellW + 6, y: r * cellH + 6 });
              }
            }
          }

          return (
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: cols - 1 }).map((_, idx) => (
                <div
                  key={`v-grid-${idx}`}
                  className="absolute bottom-0 top-0 border-l border-dashed border-pine"
                  style={{ left: `${(idx + 1) * cellW}px` }}
                />
              ))}
              {Array.from({ length: rows - 1 }).map((_, idx) => (
                <div
                  key={`h-grid-${idx}`}
                  className="absolute left-0 right-0 border-t border-dashed border-pine"
                  style={{ top: `${(idx + 1) * cellH}px` }}
                />
              ))}
              {badges.map((b) => (
                <div
                  key={b.num}
                  className="absolute flex items-center justify-center rounded-full bg-pine px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                  style={{ left: `${b.x}px`, top: `${b.y}px` }}
                >
                  {b.num}
                </div>
              ))}
            </div>
          );
        })()}

        {exclusionBands && exclusionBands.headerPt > 0 && (
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 border-b border-dashed border-amber-500/70 bg-amber-500/15"
            style={{
              height: `${Math.min(canvasRect.height - 4, exclusionBands.headerPt * viewport.scale)}px`,
            }}
          >
            <span className="absolute left-2 top-0.5 rounded bg-amber-500/80 px-1 py-0.5 text-[9px] font-medium text-white shadow-xs">
              Header
            </span>
          </div>
        )}

        {exclusionBands && exclusionBands.footerPt > 0 && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-dashed border-amber-500/70 bg-amber-500/15"
            style={{
              height: `${Math.min(canvasRect.height - 4, exclusionBands.footerPt * viewport.scale)}px`,
            }}
          >
            <span className="absolute bottom-0.5 left-2 rounded bg-amber-500/80 px-1 py-0.5 text-[9px] font-medium text-white shadow-xs">
              Footer
            </span>
          </div>
        )}

        {HANDLE_POSITIONS.map(({ handle, className, cursor }) => (
          <div
            key={handle}
            onPointerDown={(event) => onResizeStart(handle, event)}
            className={`pointer-events-auto absolute h-5 w-5 rounded-full border-2 border-white bg-sky shadow-md transition-transform duration-150 hover:scale-125 ${className} ${cursor}`}
          />
        ))}
      </div>
    </div>
  );
});
