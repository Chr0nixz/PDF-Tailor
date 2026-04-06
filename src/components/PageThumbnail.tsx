import { memo, useEffect, useRef, type MouseEvent } from "react";
import { isQuarterTurnRotation, normalizeRotation } from "@/utils/documentWarnings";
import type { PageMetadata } from "@/types";

interface PageThumbnailProps {
  page: PageMetadata;
  isActive: boolean;
  isSelected: boolean;
  hasCrop: boolean;
  thumbnail: {
    status: "idle" | "loading" | "ready" | "error";
    dataUrl: string | null;
  } | null;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onVisible: (pageIndex: number) => void;
}

export const PageThumbnail = memo(function PageThumbnail({
  page,
  isActive,
  isSelected,
  hasCrop,
  thumbnail,
  onSelect,
  onVisible,
}: PageThumbnailProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const showRotation = isQuarterTurnRotation(page.rotation);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onVisible(page.pageIndex);
        }
      },
      {
        rootMargin: "200px 0px",
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible, page.pageIndex]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
        isActive ? "border-sky bg-sky/10" : "border-ink/8 bg-white/70 hover:border-ink/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Page {page.pageIndex + 1}</div>
        <div className="flex items-center gap-2">
          {showRotation ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-900">
              {normalizeRotation(page.rotation)}°
            </span>
          ) : null}
          {hasCrop ? (
            <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-ember">
              Crop
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] ${
              isSelected ? "bg-pine text-white" : "bg-ink/5 text-ink/45"
            }`}
          >
            {isSelected ? "Selected" : "Ready"}
          </span>
        </div>
      </div>
      <div className="subtle-grid mt-4 flex h-40 items-center justify-center rounded-[18px] border border-dashed border-ink/10 bg-panel p-3">
        {thumbnail?.status === "ready" && thumbnail.dataUrl ? (
          <img
            src={thumbnail.dataUrl}
            alt={`Page ${page.pageIndex + 1}`}
            className="max-h-full rounded-[12px] border border-ink/10 bg-paper shadow-sm"
          />
        ) : thumbnail?.status === "error" ? (
          <div className="rounded-[14px] border border-ember/15 bg-white/85 px-4 py-6 text-center text-xs text-ember">
            Thumbnail failed
          </div>
        ) : (
          <div className="rounded-[14px] border border-ink/10 bg-paper px-4 py-6 text-center shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-ink/45">
              {thumbnail?.status === "loading" ? "Loading" : "Thumbnail"}
            </div>
            <div className="mt-1 text-sm text-ink/70">
              {Math.round(page.widthPt)} x {Math.round(page.heightPt)} pt
            </div>
          </div>
        )}
      </div>
    </button>
  );
});
