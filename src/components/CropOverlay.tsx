import { memo, type PointerEvent as ReactPointerEvent } from "react";

interface CropOverlayProps {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export const CropOverlay = memo(function CropOverlay({ onPointerDown }: CropOverlayProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute inset-0 z-10 cursor-crosshair rounded-[20px]"
    />
  );
});
