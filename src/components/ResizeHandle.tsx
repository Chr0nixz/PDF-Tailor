import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: "left" | "right";
}

export function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      startXRef.current = e.clientX;

      const onMove = (moveEvent: PointerEvent) => {
        if (!draggingRef.current) return;
        const delta = direction === "right"
          ? moveEvent.clientX - startXRef.current
          : startXRef.current - moveEvent.clientX;
        startXRef.current = moveEvent.clientX;
        onResize(delta);
      };

      const onUp = (upEvent: PointerEvent) => {
        draggingRef.current = false;
        target.releasePointerCapture(upEvent.pointerId);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [direction, onResize],
  );

  return (
    <div
      className="group relative flex w-4 flex-shrink-0 cursor-col-resize items-center justify-center transition-opacity touch-none"
      onPointerDown={handlePointerDown}
    >
      <div className="h-full w-0.5 rounded-full bg-ink/8 transition-all group-hover:w-1 group-hover:bg-ink/20 dark:bg-white/8 dark:group-hover:bg-white/20" />
    </div>
  );
}
