import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageThumbnail } from "@/components/PageThumbnail";
import { useContextMenu, type ContextMenuItem } from "@/components/ContextMenu";
import { usePdfStore } from "@/store/usePdfStore";
import type { PageMetadata } from "@/types";

const DRAGGING_Z_INDEX = 50;

interface DraggablePageThumbnailProps {
  page: PageMetadata;
  isActive: boolean;
  isSelected: boolean;
  hasCrop: boolean;
  thumbnail: {
    status: "idle" | "loading" | "ready" | "error";
    dataUrl: string | null;
  } | null;
  onSelect: (event: import("react").MouseEvent<HTMLButtonElement>) => void;
  onVisible: (pageIndex: number) => void;
}

export function DraggablePageThumbnail({
  page,
  isActive,
  isSelected,
  hasCrop,
  thumbnail,
  onSelect,
  onVisible,
}: DraggablePageThumbnailProps) {
  const { t } = useTranslation();
  const clipboard = usePdfStore((s) => s.clipboard);
  const copyCrop = usePdfStore((s) => s.copyCrop);
  const pasteCropToPages = usePdfStore((s) => s.pasteCropToPages);
  const clearPageCrops = usePdfStore((s) => s.clearPageCrops);
  const selectAllPages = usePdfStore((s) => s.selectAllPages);
  const rotatePage = usePdfStore((s) => s.rotatePage);
  const { open } = useContextMenu();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `page-${page.sourceId}` });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
      zIndex: isDragging ? DRAGGING_Z_INDEX : undefined,
    }),
    [transform, transition, isDragging],
  );

  const handleContextMenu = (e: React.MouseEvent) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex w-full items-stretch gap-1"
    >
      {/* Dedicated drag handle — only this area initiates drag */}
      <div
        {...attributes}
        {...listeners}
        className="flex w-6 cursor-grab items-center justify-center rounded-[16px] py-4 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing active:opacity-100"
        title={t("thumbnail.dragHandle")}
      >
        <svg
          width="10"
          height="16"
          viewBox="0 0 10 16"
          fill="none"
          aria-hidden="true"
          className="text-ink/40 dark:text-ink-light/40"
        >
          <circle cx="2" cy="2" r="1.5" fill="currentColor" />
          <circle cx="8" cy="2" r="1.5" fill="currentColor" />
          <circle cx="2" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="2" cy="14" r="1.5" fill="currentColor" />
          <circle cx="8" cy="14" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {/* Main thumbnail — click to select, context menu, no drag */}
      <div
        className="flex-1"
        onContextMenu={handleContextMenu}
        data-testid={`draggable-page-${page.sourceId}`}
      >
        <PageThumbnail
          page={page}
          isActive={isActive}
          isSelected={isSelected}
          hasCrop={hasCrop}
          thumbnail={thumbnail}
          onSelect={onSelect}
          onVisible={onVisible}
        />
      </div>
    </div>
  );
}
