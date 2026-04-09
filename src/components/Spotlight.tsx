import { useCallback, useEffect, useRef, useState } from "react";

interface SpotlightProps {
  targetRef: React.RefObject<HTMLElement | null>;
  padding?: number;
}

export function Spotlight({ targetRef, padding = 8 }: SpotlightProps) {
  const [pathD, setPathD] = useState("");
  const viewportRef = useRef({ width: 0, height: 0 });

  const update = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    viewportRef.current = { width: vw, height: vh };

    const outer = `M0,0 L${vw},0 L${vw},${vh} L0,${vh} Z`;
    const ix = rect.left - padding;
    const iy = rect.top - padding;
    const iw = rect.width + padding * 2;
    const ih = rect.height + padding * 2;
    const inner = `M${ix},${iy} L${ix + iw},${iy} L${ix + iw},${iy + ih} L${ix},${iy + ih} Z`;

    setPathD(`${outer} ${inner}`);
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

  const vp = viewportRef.current;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[150]"
      width={vp.width}
      height={vp.height}
      viewBox={`0 0 ${vp.width} ${vp.height}`}
      preserveAspectRatio="none"
    >
      <path
        d={pathD || "M0,0 L0,0 L0,0 L0,0 Z"}
        fill="rgba(0,0,0,0.65)"
        fillRule="evenodd"
      />
    </svg>
  );
}
