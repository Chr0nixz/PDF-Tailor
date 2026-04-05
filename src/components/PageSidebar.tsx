import { usePdfStore } from "@/store/usePdfStore";

export function PageSidebar() {
  const pages = usePdfStore((state) => state.pages);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const selectedPageIndices = usePdfStore((state) => state.selectedPageIndices);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const toggleSelectedPage = usePdfStore((state) => state.toggleSelectedPage);

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
        <div className="flex-1 space-y-3 overflow-auto pr-1">
          {pages.map((page) => {
            const active = page.pageIndex === currentPageIndex;
            const selected = selectedPageIndices.includes(page.pageIndex);

            return (
              <button
                key={page.pageIndex}
                type="button"
                onClick={() => toggleSelectedPage(page.pageIndex)}
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  active
                    ? "border-sky bg-sky/10"
                    : "border-ink/8 bg-white/70 hover:border-ink/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Page {page.pageIndex + 1}</div>
                  <div
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] ${
                      selected ? "bg-pine text-white" : "bg-ink/5 text-ink/45"
                    }`}
                  >
                    {selected ? "Selected" : "Ready"}
                  </div>
                </div>
                <div className="subtle-grid mt-4 flex h-28 items-center justify-center rounded-[18px] border border-dashed border-ink/10 bg-panel">
                  <div className="rounded-[14px] border border-ink/10 bg-paper px-4 py-4 text-center shadow-sm">
                    <div className="text-xs uppercase tracking-[0.2em] text-ink/45">Size</div>
                    <div className="mt-1 text-sm text-ink/70">
                      {Math.round(page.widthPt)} x {Math.round(page.heightPt)} pt
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
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
