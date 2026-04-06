import { useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PageThumbnail } from "@/components/PageThumbnail";
import { useThumbnails } from "@/hooks/useThumbnails";
import { usePdfStore } from "@/store/usePdfStore";
import type { PDFDocumentProxy } from "@/lib/pdfjs";
import { isQuarterTurnRotation } from "@/utils/documentWarnings";

interface PageSidebarProps {
  documentProxy: PDFDocumentProxy | null;
}

function parsePageRangeInput(value: string, pageCount: number) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      pageIndices: [] as number[],
      error: "Enter pages like 1-5, 8, 10-12.",
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
          error: `Invalid range: "${segment}".`,
        };
      }

      const rangeStart = Math.min(start, end);
      const rangeEnd = Math.max(start, end);

      for (let pageNumber = rangeStart; pageNumber <= rangeEnd; pageNumber += 1) {
        if (pageNumber < 1 || pageNumber > pageCount) {
          return {
            pageIndices: [] as number[],
            error: `Page ${pageNumber} is outside 1-${pageCount}.`,
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
        error: `Invalid page: "${segment}".`,
      };
    }

    if (pageNumber < 1 || pageNumber > pageCount) {
      return {
        pageIndices: [] as number[],
        error: `Page ${pageNumber} is outside 1-${pageCount}.`,
      };
    }

    pageIndices.add(pageNumber - 1);
  }

  return {
    pageIndices: [...pageIndices].sort((left, right) => left - right),
    error: null,
  };
}

export function PageSidebar({ documentProxy }: PageSidebarProps) {
  const pages = usePdfStore((state) => state.pages);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const selectedPageIndices = usePdfStore((state) => state.selectedPageIndices);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const setSelectedPages = usePdfStore((state) => state.setSelectedPages);
  const toggleSelectedPage = usePdfStore((state) => state.toggleSelectedPage);
  const clearPageCrops = usePdfStore((state) => state.clearPageCrops);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [pageRangeInput, setPageRangeInput] = useState("");
  const [pageRangeError, setPageRangeError] = useState<string | null>(null);
  const { thumbnails, requestThumbnail } = useThumbnails(documentProxy, pages);
  const rowVirtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 236,
    overscan: 4,
  });
  const croppedPageIndices = useMemo(
    () =>
      pages
        .filter((page) => Boolean(pageCrops[page.pageIndex]?.cropRect))
        .map((page) => page.pageIndex),
    [pageCrops, pages],
  );
  const uncroppedPageIndices = useMemo(
    () =>
      pages
        .filter((page) => !pageCrops[page.pageIndex]?.cropRect)
        .map((page) => page.pageIndex),
    [pageCrops, pages],
  );
  const rotatedPageIndices = useMemo(
    () => pages.filter((page) => isQuarterTurnRotation(page.rotation)).map((page) => page.pageIndex),
    [pages],
  );
  const selectedCroppedCount = selectedPageIndices.filter(
    (pageIndex) => Boolean(pageCrops[pageIndex]?.cropRect),
  ).length;

  const applyPageRangeSelection = () => {
    const parsed = parsePageRangeInput(pageRangeInput, pages.length);
    if (parsed.error) {
      setPageRangeError(parsed.error);
      return;
    }

    setPageRangeError(null);
    setSelectedPages(parsed.pageIndices, {
      currentPageIndex: parsed.pageIndices.at(-1) ?? currentPageIndex,
      anchorPageIndex: parsed.pageIndices[0] ?? null,
    });
  };

  return (
    <aside className="panel-surface flex min-h-0 min-h-[520px] flex-col overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Pages</div>
          <div className="mt-1 text-lg font-semibold">Document navigation</div>
        </div>
        <div className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink/60">
          {pages.length} items
        </div>
      </div>
      {documentLoadState === "ready" && pages.length > 0 ? (
        <div className="mb-4 rounded-[24px] border border-ink/8 bg-white/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45">
              Selection tools
            </div>
            <div className="rounded-full bg-ink/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink/60">
              {selectedPageIndices.length} selected
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedPages(croppedPageIndices, {
                  currentPageIndex: croppedPageIndices[0] ?? currentPageIndex,
                  anchorPageIndex: croppedPageIndices[0] ?? null,
                })
              }
              className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-medium text-ink transition hover:border-ink/20"
            >
              Cropped ({croppedPageIndices.length})
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedPages(uncroppedPageIndices, {
                  currentPageIndex: uncroppedPageIndices[0] ?? currentPageIndex,
                  anchorPageIndex: uncroppedPageIndices[0] ?? null,
                })
              }
              className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-medium text-ink transition hover:border-ink/20"
            >
              Uncropped ({uncroppedPageIndices.length})
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedPages(rotatedPageIndices, {
                  currentPageIndex: rotatedPageIndices[0] ?? currentPageIndex,
                  anchorPageIndex: rotatedPageIndices[0] ?? null,
                })
              }
              className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-medium text-ink transition hover:border-ink/20"
            >
              Rotated ({rotatedPageIndices.length})
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedPages(
                  pages.map((page) => page.pageIndex),
                  { currentPageIndex: 0, anchorPageIndex: 0 },
                )
              }
              className="rounded-full border border-ink/10 bg-white/80 px-3 py-2 text-xs font-medium text-ink transition hover:border-ink/20"
            >
              All pages
            </button>
          </div>
          <div className="mt-3">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              Page range
            </div>
            <div className="flex gap-2">
              <input
                value={pageRangeInput}
                onChange={(event) => setPageRangeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyPageRangeSelection();
                  }
                }}
                placeholder="1-5, 8, 10-12"
                className="min-w-0 flex-1 rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky"
              />
              <button
                type="button"
                onClick={applyPageRangeSelection}
                className="rounded-full bg-ink px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-white transition hover:bg-ink/90"
              >
                Select
              </button>
            </div>
            {pageRangeError ? (
              <div className="mt-2 text-xs text-ember">{pageRangeError}</div>
            ) : (
              <div className="mt-2 text-xs text-ink/50">
                Shift-click selects a contiguous range from the last focused page.
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              disabled={selectedCroppedCount === 0}
              onClick={() => clearPageCrops(selectedPageIndices)}
              className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50"
            >
              Clear crops on selected pages ({selectedCroppedCount})
            </button>
          </div>
        </div>
      ) : null}
      {documentLoadState === "loading" ? (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-ink/10 bg-white/60 px-4 text-center text-sm text-ink/60">
          Reading page metadata...
        </div>
      ) : null}
      {documentLoadState !== "loading" ? (
        <div ref={parentRef} className="min-h-0 flex-1 overflow-auto pr-1">
          <div
            className="relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const page = pages[virtualItem.index];

              if (!page) {
                return null;
              }

              const active = page.pageIndex === currentPageIndex;
              const selected = selectedPageIndices.includes(page.pageIndex);
              const hasCrop = Boolean(pageCrops[page.pageIndex]?.cropRect);

              return (
                <div
                  key={page.pageIndex}
                  className="absolute left-0 top-0 w-full pb-3"
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <PageThumbnail
                    page={page}
                    isActive={active}
                    isSelected={selected}
                    hasCrop={hasCrop}
                    thumbnail={thumbnails[page.pageIndex] ?? null}
                    onVisible={requestThumbnail}
                    onSelect={(event: MouseEvent<HTMLButtonElement>) =>
                      toggleSelectedPage(
                        page.pageIndex,
                        event.ctrlKey || event.metaKey,
                        event.shiftKey,
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
          {pages.length === 0 ? (
            <div className="flex h-full min-h-52 items-center justify-center rounded-[24px] border border-dashed border-ink/10 bg-white/60 px-4 text-center text-sm text-ink/60">
              No pages available yet.
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
