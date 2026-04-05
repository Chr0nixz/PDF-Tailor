import { usePdfStore } from "@/store/usePdfStore";

function ZoomButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-ink/25"
    >
      {label}
    </button>
  );
}

export function Header() {
  const fileName = usePdfStore((state) => state.fileName);
  const zoom = usePdfStore((state) => state.zoom);
  const pageCount = usePdfStore((state) => state.pageCount);
  const setZoom = usePdfStore((state) => state.setZoom);
  const setPreviewOpen = usePdfStore((state) => state.setPreviewOpen);
  const setExportDialogOpen = usePdfStore((state) => state.setExportDialogOpen);

  return (
    <header className="panel-surface flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-center gap-4">
        <div className="rounded-[20px] bg-ink px-4 py-3 text-white">
          <div className="text-xs uppercase tracking-[0.24em] text-white/60">PDF-Tailor</div>
          <div className="mt-1 text-lg font-semibold">Phase 1</div>
        </div>
        <div>
          <div className="text-sm font-medium text-ink/55">当前文档</div>
          <div className="mt-1 text-base font-semibold">
            {fileName ?? "尚未加载 PDF"}
          </div>
          <div className="text-sm text-ink/55">
            {pageCount > 0 ? `${pageCount} pages loaded` : "等待阶段 2 接入真实文件流"}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ZoomButton label="-" onClick={() => setZoom(Math.max(0.25, zoom - 0.1))} />
        <div className="min-w-16 rounded-full bg-white/80 px-3 py-1.5 text-center text-sm font-medium text-ink">
          {Math.round(zoom * 100)}%
        </div>
        <ZoomButton label="+" onClick={() => setZoom(Math.min(3, zoom + 0.1))} />
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25"
        >
          预览
        </button>
        <button
          type="button"
          onClick={() => setExportDialogOpen(true)}
          className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-white transition hover:bg-ember/90"
        >
          导出
        </button>
      </div>
    </header>
  );
}
