import { memo, useEffect, useRef, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/Skeleton";
import { useContextMenu, type ContextMenuItem } from "@/components/ContextMenu";
import { usePdfStore } from "@/store/usePdfStore";
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
  const { t } = useTranslation();
  const ref = useRef<HTMLButtonElement | null>(null);
  const showRotation = isQuarterTurnRotation(page.rotation);
  const clipboard = usePdfStore((s) => s.clipboard);
  const copyCrop = usePdfStore((s) => s.copyCrop);
  const pasteCropToPages = usePdfStore((s) => s.pasteCropToPages);
  const clearPageCrops = usePdfStore((s) => s.clearPageCrops);
  const selectAllPages = usePdfStore((s) => s.selectAllPages);
  const rotatePage = usePdfStore((s) => s.rotatePage);
  const { open } = useContextMenu();

  const handleContextMenu = (e: MouseEvent<HTMLButtonElement>) => {
    const items: ContextMenuItem[] = [
      {
        label: t("thumbnail.context.copyCrop"),
        shortcut: "Ctrl+C",
        disabled: !hasCrop,
        action: () => copyCrop(page.sourceId),
      },
      {
        label: t("thumbnail.context.pasteCrop"),
        shortcut: "Ctrl+V",
        disabled: !clipboard,
        action: () => pasteCropToPages([page.sourceId]),
      },
      {
        label: t("thumbnail.context.clearCrop"),
        disabled: !hasCrop,
        danger: true,
        action: () => clearPageCrops([page.sourceId]),
      },
      { divider: true },
      {
        label: t("thumbnail.context.rotateCw"),
        action: () => rotatePage(page.sourceId, 90),
      },
      {
        label: t("thumbnail.context.rotateCcw"),
        action: () => rotatePage(page.sourceId, -90),
      },
      {
        label: t("thumbnail.context.selectAll"),
        shortcut: "Ctrl+A",
        action: () => selectAllPages(),
      },
    ];
    open(e, { type: "thumbnail", pageIndex: page.sourceId }, items);
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onVisible(page.sourceId);
        }
      },
      {
        rootMargin: "200px 0px",
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible, page.sourceId]);

  return (
    <button
      ref={ref}
      type="button"
      data-testid={`page-thumbnail-${page.sourceId}`}
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      aria-pressed={isSelected}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all duration-200 active:scale-[0.98] ${
        isActive ? "border-sky bg-sky/10 dark:border-sky-dark dark:bg-sky-dark/10" : "border-ink/8 bg-white/70 hover:border-ink/20 hover:shadow-md hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink dark:text-ink-light">
          {t("thumbnail.page", { page: page.pageIndex + 1 })}
        </div>
        <div className="flex items-center gap-2">
          {showRotation ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              {normalizeRotation(page.rotation)}&deg;
            </span>
          ) : null}
          {hasCrop ? (
            <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-ember dark:bg-ember-dark/15 dark:text-ember-dark">
              {t("thumbnail.cropped")}
            </span>
          ) : null}
          {isSelected ? (
            <span className="rounded-full bg-pine px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white dark:bg-pine-dark">
              {t("thumbnail.selected")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="subtle-grid mt-4 flex h-40 items-center justify-center rounded-[18px] border border-dashed border-ink/10 bg-panel p-3 dark:border-white/10 dark:bg-panel-dark">
        {thumbnail?.status === "ready" && thumbnail.dataUrl ? (
          <img
            src={thumbnail.dataUrl}
            alt={t("thumbnail.altText", { page: page.pageIndex + 1 })}
            className="max-h-full rounded-[12px] border border-ink/10 bg-paper shadow-sm transition-transform dark:border-white/10 dark:bg-paper-dark dark:shadow-none"
            style={{ transform: page.userRotation ? `rotate(${page.userRotation}deg)` : undefined }}
          />
        ) : thumbnail?.status === "error" ? (
          <div className="rounded-[14px] border border-ember/15 bg-white/85 px-4 py-6 text-center text-xs text-ember dark:border-ember-dark/15 dark:bg-white/5 dark:text-ember-dark">
            {t("thumbnail.error")}
          </div>
        ) : thumbnail?.status === "loading" ? (
          <div className="flex h-full w-full flex-col gap-2 p-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <div className="rounded-[14px] border border-ink/10 bg-paper px-4 py-6 text-center shadow-sm dark:border-white/10 dark:bg-paper-dark dark:text-ink-light/70">
            <div className="text-xs uppercase tracking-[0.2em] text-ink/45 dark:text-ink-light/45">
              {t("thumbnail.thumbnail")}
            </div>
            <div className="mt-1 text-sm text-ink/70 dark:text-ink-light/70">
              {Math.round(page.widthPt)} x {Math.round(page.heightPt)} pt
            </div>
          </div>
        )}
      </div>
    </button>
  );
});
