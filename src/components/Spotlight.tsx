import { useCallback, useEffect, useRef, useState } from "react";

interface SpotlightProps {
  targetRef: React.RefObject<HTMLElement | null>;
  padding?: number;
}

export function Spotlight({ targetRef, padding = 8 }: SpotlightProps) {
  const [clipPath, setClipPath] = useState("none");
  const rafRef = useRef<number | null>(null);

  const update = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = rect.left - padding;
    const y = rect.top - padding;
    const w = rect.width + padding * 2;
    const h = rect.height + padding * 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // clockwise polygon: outer rect (inset) + inner rect (counter-clockwise = hole)
    const ox = Math.max(0, x);
    const oy = Math.max(0, y);
    const ow = Math.min(w, vw - ox);
    const oh = Math.min(h, vh - oy);

    const poly = `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%,
      ${ox}px ${oy}px,
      ${ox + ow}px ${oy}px,
      ${ox + ow}px ${oy + oh}px,
      ${ox}px ${oy + oh}px,
      ${ox}px ${oy}px,
      ${x}px ${y + h}px,
      ${x + w}px ${y + h}px,
      ${x + w}px ${y}px,
      ${x}px ${y}px,
      ${ox}px ${oy}px
    )`;

    setClipPath(poly);
  }, [targetRef, padding]);

  useEffect(() => {
    update();

    const observer = new ResizeObserver(update);
    if (targetRef.current) observer.observe(targetRef.current);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [update]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[150]"
      style={{
        clipPath,
        background: "rgba(0,0,0,0.65)",
        transition: "clip-path 100ms ease-out",
      }}
    />
  );
}
