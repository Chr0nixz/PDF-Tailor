import { usePdfStore } from "@/store/usePdfStore";

export function Workspace() {
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const pages = usePdfStore((state) => state.pages);
  const zoom = usePdfStore((state) => state.zoom);
  const page = pages[currentPageIndex];

  return (
    <section className="panel-surface flex min-h-[520px] flex-col overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Workspace</div>
          <div className="mt-1 text-lg font-semibold">中央画布骨架</div>
        </div>
        <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink/60">
          Zoom {Math.round(zoom * 100)}%
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-ink/10 bg-[linear-gradient(180deg,_rgba(255,253,248,0.8)_0%,_rgba(230,238,245,0.8)_100%)] p-6">
        <div className="relative flex min-h-[460px] w-full items-center justify-center overflow-hidden rounded-[24px] bg-[#dbe3ea]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(91,141,239,0.12),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(184,92,56,0.08),_transparent_24%)]" />
          {page ? (
            <div
              className="relative rounded-[20px] border border-ink/10 bg-paper shadow-[0_24px_60px_rgba(24,34,48,0.12)]"
              style={{
                width: `${Math.max(260, page.widthPt * 0.45 * zoom)}px`,
                height: `${Math.max(360, page.heightPt * 0.45 * zoom)}px`,
              }}
            >
              <div className="absolute inset-5 rounded-[14px] border border-dashed border-sky/60" />
              <div className="absolute left-[18%] top-[14%] h-[52%] w-[46%] rounded-[18px] border-2 border-ember bg-ember/10" />
              <div className="absolute right-5 top-5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
                Page {currentPageIndex + 1}
              </div>
              <div className="absolute bottom-5 left-5 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink/65">
                Phase 1 placeholder workspace
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] bg-white/70 px-6 py-4 text-sm text-ink/60">
              载入文档后，这里会渲染 pdf.js canvas 与裁剪覆盖层。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
