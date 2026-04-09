import { useCallback, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggablePageThumbnail } from "@/components/DraggablePageThumbnail";
import { DiagnosticPanel } from "@/components/DiagnosticPanel";
import { useThumbnails } from "@/hooks/useThumbnails";
import { usePdfStore } from "@/store/usePdfStore";
import type { PDFDocumentProxy } from "@/lib/pdfjs";
import type { PageMetadata } from "@/types";

interface PageSidebarProps {
  documentProxy: PDFDocumentProxy | null;
}

type ParseError =
  | { key: "sidebar.invalidRange" }
  | { key: "sidebar.invalidRangeSegment"; segment: string }
  | { key: "sidebar.invalidPageNum"; segment: string }
  | { key: "sidebar.pageOutOfRange"; page: number; total: number };

function parsePageRangeInput(value: string, pageCount: number) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      pageIndices: [] as number[],
      error: { key: "sidebar.invalidRange" } as ParseError,
    };
  }

  const pageIndices = new Set<number>();

  for (const rawSegment of trimmed.split(",")) {
    const segment = rawSegment.trim();
    if (!segment) {
      continue;
    }

    if (segment.includes("-")) {
      const [startRaw, endRaw] = segment.split("-").map((part) => part.trim());
      const start = Number.parseInt(startRaw, 10);
      const end = Number.parseInt(endRaw, 10);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return {
          pageIndices: [] as number[],
          error: { key: "sidebar.invalidRangeSegment", segment } as ParseError,
        };
      }

      const rangeStart = Math.min(start, end);
      const rangeEnd = Math.max(start, end);

      for (let pageNumber = rangeStart; pageNumber <= rangeEnd; pageNumber += 1) {
        if (pageNumber < 1 || pageNumber > pageCount) {
          return {
            pageIndices: [] as number[],
            error: { key: "sidebar.pageOutOfRange", page: pageNumber, total: pageCount } as ParseError,
          };
        }

        pageIndices.add(pageNumber - 1);
      }
      continue;
    }

    const pageNumber = Number.parseInt(segment, 10);
    if (!Number.isInteger(pageNumber)) {
      return {
        pageIndices: [] as number[],
        error: { key: "sidebar.invalidPageNum", segment } as ParseError,
      };
    }

    if (pageNumber < 1 || pageNumber > pageCount) {
      return {
        pageIndices: [] as number[],
        error: { key: "sidebar.pageOutOfRange", page: pageNumber, total: pageCount } as ParseError,
      };
    }

    pageIndices.add(pageNumber - 1);
  }

  return {
    pageIndices: [...pageIndices].sort((left, right) => left - right),
    error: null,
  };
}

function sourceIdsToSelection(sourceIds: number[], pages: PageMetadata[], currentPageIndex: number) {
  const firstSid = sourceIds[0];
  const firstDispIdx = firstSid !== undefined
    ? pages.findIndex((p) => p.sourceId === firstSid)
    : currentPageIndex;
  return {
    currentPageIndex: firstDispIdx,
    anchorPageIndex: firstSid !== undefined ? firstDispIdx : null,
  };
}

function translateError(t: TFunction<"translation", undefined>, error: ParseError) {
  switch (error.key) {
    case "sidebar.invalidRange":
      return t("sidebar.invalidRange");
    case "sidebar.invalidRangeSegment":
      return t("sidebar.invalidRangeSegment", { segment: error.segment });
    case "sidebar.invalidPageNum":
      return t("sidebar.invalidPageNum", { segment: error.segment });
    case "sidebar.pageOutOfRange":
      return t("sidebar.pageOutOfRange", { page: error.page, total: error.total });
  }
}

export function PageSidebar({ documentProxy }: PageSidebarProps) {
  const { t } = useTranslation();
  const pages = usePdfStore((state) => state.pages);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const selectedPageIndices = usePdfStore((state) => state.selectedPageIndices);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const setSelectedPages = usePdfStore((state) => state.setSelectedPages);
  const toggleSelectedPage = usePdfStore((state) => state.toggleSelectedPage);
  const clearPageCrops = usePdfStore((state) => state.clearPageCrops);
  const reorderPages = usePdfStore((state) => state.reorderPages);
  const restoreOriginalOrder = usePdfStore((state) => state.restoreOriginalOrder);
  const isOrderModified = usePdfStore((state) => state.isOrderModified);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [pageRangeInput, setPageRangeInput] = useState("");
  const [pageRangeError, setPageRangeError] = useState<string | null>(null);
  const { thumbnails, requestThumbnail } = useThumbnails(documentProxy, pages);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [pageRangeExpanded, setPageRangeExpanded] = useState(false);
  const [batchSelectExpanded, setBatchSelectExpanded] = useState(false);
  const rowVirtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 236,
    overscan: 4,
  });
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const parseSourceId = (id: string | number) =>
        Number.parseInt(String(id).replace(/^page-/, ""), 10);
      const activeSourceId = parseSourceId(active.id);
      const overSourceId = parseSourceId(over.id);
      const activeIndex = pages.findIndex((page) => page.sourceId === activeSourceId);
      const overIndex = pages.findIndex((page) => page.sourceId === overSourceId);
      if (activeIndex !== -1 && overIndex !== -1) {
        reorderPages(activeIndex, overIndex);
      }
    },
    [pages, reorderPages],
  );
  const sortableItems = useMemo(
    () => pages.map((page) => `page-${page.sourceId}`),
    [pages],
  );
  const croppedPageIndices = useMemo(
    () =>
      pages
        .filter((page) => Boolean(pageCrops[page.sourceId]?.cropRect))
        .map((page) => page.sourceId),
    [pageCrops, pages],
  );
  const uncroppedPageIndices = useMemo(
    () =>
      pages
        .filter((page) => !pageCrops[page.sourceId]?.cropRect)
        .map((page) => page.sourceId),
    [pageCrops, pages],
  );
  const selectedCroppedCount = selectedPageIndices.filter(
    (pageIndex) => Boolean(pageCrops[pageIndex]?.cropRect),
  ).length;

  const applyPageRangeSelection = () => {
    const parsed = parsePageRangeInput(pageRangeInput, pages.length);
    if (parsed.error) {
      setPageRangeError(translateError(t, parsed.error));
      return;
    }

    setPageRangeError(null);
    // parsed.pageIndices are display indices; convert to sourceIds for selectedPageIndices
    const sourceIds = parsed.pageIndices
      .map((dispIdx) => pages[dispIdx]?.sourceId)
      .filter((sid): sid is number => sid !== undefined);
    const lastSourceId = sourceIds.at(-1);
    const firstSourceId = sourceIds[0];
    const lastDisplayIdx = lastSourceId !== undefined
      ? pages.findIndex((p) => p.sourceId === lastSourceId)
      : currentPageIndex;
    setSelectedPages(sourceIds, {
      currentPageIndex: lastDisplayIdx,
      anchorPageIndex: firstSourceId !== undefined
        ? pages.findIndex((p) => p.sourceId === firstSourceId)
        : null,
    });
  };

  return (
    <aside className="panel-surface flex min-h-0 flex-col overflow-hidden p-4 md:min-h-[520px] lg:h-[var(--panel-viewport-h)] lg:overflow-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55 dark:text-ink-light/55">{t("sidebar.title")}</div>
          <div className="mt-1 text-lg font-semibold text-ink dark:text-ink-light">{t("sidebar.subtitle")}</div>
        </div>
        <div className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink/60 dark:bg-white/5 dark:text-ink-light/55">
          {t("sidebar.totalPages", { count: pages.length })}
        </div>
      </div>
      {isOrderModified() ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-[16px] border border-amber/20 bg-amber/10 px-3 py-2 text-xs text-amber dark:border-amber-dark/30 dark:bg-amber-dark/10 dark:text-amber-dark">
          <span>{t("sidebar.orderModifiedHint")}</span>
          <button
            type="button"
            onClick={restoreOriginalOrder}
            className="rounded-full border border-amber/30 bg-amber/20 px-2.5 py-1 font-medium transition hover:bg-amber/30 dark:border-amber-dark/40 dark:bg-amber-dark/20 dark:hover:bg-amber-dark/30"
          >
            {t("sidebar.restoreOrder")}
          </button>
        </div>
      ) : null}
      {documentLoadState === "ready" && pages.length > 0 ? (
        <div className="mb-4">
          <DiagnosticPanel />
        </div>
      ) : null}
      {documentLoadState === "ready" && pages.length > 0 ? (
        <div className="mb-4 rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          {!batchSelectExpanded ? (
            <button
              type="button"
              onClick={() => setBatchSelectExpanded(true)}
              className="flex w-full items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
                  {t("sidebar.batchSelectLabel")}
                </div>
                <div className="rounded-full bg-ink/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60 dark:bg-white/5 dark:text-ink-light/55">
                  {t("sidebar.selectedCount", { count: selectedPageIndices.length })}
                </div>
              </div>
              <span className="text-ink/60 dark:text-ink-light/60">▼</span>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
                  {t("sidebar.batchSelectLabel")}
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-ink/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60 dark:bg-white/5 dark:text-ink-light/55">
                    {t("sidebar.selectedCount", { count: selectedPageIndices.length })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBatchSelectExpanded(false)}
                    className="rounded-full p-1 text-ink/60 hover:bg-ink/5 dark:text-ink-light/60 dark:hover:bg-white/10"
                  >
                    ▲
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPages(croppedPageIndices, sourceIdsToSelection(croppedPageIndices, pages, currentPageIndex));
                  }}
                  className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-medium text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
                >
                  {t("sidebar.cropped", { count: croppedPageIndices.length })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPages(uncroppedPageIndices, sourceIdsToSelection(uncroppedPageIndices, pages, currentPageIndex));
                  }}
                  className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-medium text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
                >
                  {t("sidebar.uncropped", { count: uncroppedPageIndices.length })}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPages(
                      pages.map((page) => page.sourceId),
                      { currentPageIndex: 0, anchorPageIndex: 0 },
                    )
                  }
                  className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-medium text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
                >
                  {t("sidebar.allPages")}
                </button>
              </div>
              <div className="mt-3 border-t border-ink/8 pt-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setPageRangeExpanded(!pageRangeExpanded)}
                  className="flex w-full items-center justify-between text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45"
                >
                  <span>{t("sidebar.pageRangeLabel")}</span>
                  <span className="text-ink/60 dark:text-ink-light/60">
                    {pageRangeExpanded ? "▲" : "▼"}
                  </span>
                </button>
                {pageRangeExpanded && (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      <input
                        value={pageRangeInput}
                        onChange={(event) => setPageRangeInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            applyPageRangeSelection();
                          }
                        }}
                        placeholder={t("sidebar.pageRangePlaceholder")}
                        className="min-w-0 flex-1 rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:focus:border-sky-dark"
                      />
                      <button
                        type="button"
                        onClick={applyPageRangeSelection}
                        className="rounded-full bg-ink px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-white transition hover:bg-ink/90 dark:bg-ink-light dark:text-mist-dark dark:hover:bg-ink-light/90"
                      >
                        {t("sidebar.select")}
                      </button>
                    </div>
                    {pageRangeError ? (
                      <div className="mt-2 text-xs text-ember">{pageRangeError}</div>
                    ) : (
                      <div className="mt-2 text-xs text-ink/50 dark:text-ink-light/50">
                        {t("sidebar.shiftSelectHint")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
      {documentLoadState === "ready" && pages.length > 0 && selectedCroppedCount > 0 ? (
        <div className="mb-4">
          <button
            type="button"
            disabled={selectedCroppedCount === 0}
            onClick={() => clearPageCrops(selectedPageIndices)}
            className="w-full rounded-full border border-ember/30 bg-ember/10 px-4 py-3 text-sm font-medium text-ember transition hover:border-ember/50 hover:bg-ember/20 dark:border-ember-dark/30 dark:bg-ember-dark/10 dark:text-ember-dark dark:hover:border-ember-dark/50 dark:hover:bg-ember-dark/20"
          >
            {t("sidebar.clearSelectedCrops", { count: selectedCroppedCount })}
          </button>
        </div>
      ) : null}
      {documentLoadState === "loading" ? (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-ink/10 bg-white/60 px-4 text-center text-sm text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-ink-light/55">
          {t("sidebar.readingPages")}
        </div>
      ) : null}
      {documentLoadState !== "loading" ? (
        <div ref={parentRef} className="min-h-0 flex-1 overflow-auto pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableItems}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="relative"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const page = pages[virtualItem.index];

                  if (!page) {
                    return null;
                  }

                  const active = pages[currentPageIndex]?.sourceId === page.sourceId;
                  const selected = selectedPageIndices.includes(page.sourceId);
                  const hasCrop = Boolean(pageCrops[page.sourceId]?.cropRect);

                  return (
                    <div
                      key={page.sourceId}
                      className="absolute left-0 top-0 w-full pb-3"
                      style={{ transform: `translateY(${virtualItem.start}px)` }}
                    >
                      <DraggablePageThumbnail
                        page={page}
                        isActive={active}
                        isSelected={selected}
                        hasCrop={hasCrop}
                        thumbnail={thumbnails[page.sourceId] ?? null}
                        onVisible={requestThumbnail}
                        onSelect={(event: MouseEvent<HTMLButtonElement>) =>
                          toggleSelectedPage(
                            page.sourceId,
                            event.ctrlKey || event.metaKey,
                            event.shiftKey,
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
          {pages.length === 0 ? (
            <div className="flex h-full min-h-52 items-center justify-center rounded-[24px] border border-dashed border-ink/10 bg-white/60 px-4 text-center text-sm text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-ink-light/55">
              {t("sidebar.noPagesHint")}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
