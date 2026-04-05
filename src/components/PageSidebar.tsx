import { useRef } from "react";
import type { MouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PageThumbnail } from "@/components/PageThumbnail";
import { useThumbnails } from "@/hooks/useThumbnails";
import { usePdfStore } from "@/store/usePdfStore";
import type { PDFDocumentProxy } from "@/lib/pdfjs";

interface PageSidebarProps {
  documentProxy: PDFDocumentProxy | null;
}

export function PageSidebar({ documentProxy }: PageSidebarProps) {
  const pages = usePdfStore((state) => state.pages);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const selectedPageIndices = usePdfStore((state) => state.selectedPageIndices);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const toggleSelectedPage = usePdfStore((state) => state.toggleSelectedPage);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const { thumbnails, requestThumbnail } = useThumbnails(documentProxy, pages);
  const rowVirtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 236,
    overscan: 4,
  });

  return (
    <aside className="panel-surface flex min-h-[520px] flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Pages</div>
          <div className="mt-1 text-lg font-semibold">Document navigation</div>
        </div>
        <div className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink/60">
          {pages.length} items
        </div>
      </div>
      {documentLoadState === "loading" ? (
        <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-ink/10 bg-white/60 px-4 text-center text-sm text-ink/60">
          Reading page metadata...
        </div>
      ) : null}
      {documentLoadState !== "loading" ? (
        <div ref={parentRef} className="flex-1 overflow-auto pr-1">
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
