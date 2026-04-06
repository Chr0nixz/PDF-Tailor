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
  const { open } = useContextMenu();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `page-${page.pageIndex}` });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
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
        action: () => copyCrop(page.pageIndex),
      },
      {
        label: t("thumbnail.context.pasteCrop"),
        shortcut: "Ctrl+V",
        disabled: !clipboard,
        action: () => pasteCropToPages([page.pageIndex]),
      },
      {
        label: t("thumbnail.context.clearCrop"),
        disabled: !hasCrop,
        danger: true,
        action: () => clearPageCrops([page.pageIndex]),
      },
      { divider: true },
      {
        label: t("thumbnail.context.selectAll"),
        shortcut: "Ctrl+A",
        action: () => selectAllPages(),
      },
    ];
    open(e, { type: "thumbnail", pageIndex: page.pageIndex }, items);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={handleContextMenu}
      data-testid={`page-thumbnail-${page.pageIndex}`}
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
  );
}
