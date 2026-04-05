import { usePdfStore } from "@/store/usePdfStore";
import { selectCurrentMargins, selectCurrentPageCrop } from "@/store/selectors";

function PropertyBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-ink/8 bg-white/75 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-ink/45">{title}</div>
      <div className="mt-2 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

export function PropertiesPanel() {
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const displayUnit = usePdfStore((state) => state.displayUnit);
  const setDisplayUnit = usePdfStore((state) => state.setDisplayUnit);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const currentCrop = selectCurrentPageCrop(currentPageIndex, pageCrops);
  const margins = selectCurrentMargins(currentPageIndex, pageCrops);

  return (
    <aside className="panel-surface flex min-h-[520px] flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Properties</div>
          <div className="mt-1 text-lg font-semibold">属性面板骨架</div>
        </div>
        <button
          type="button"
          onClick={() => setDisplayUnit(displayUnit === "mm" ? "pt" : "mm")}
          className="rounded-full border border-ink/10 bg-white/75 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-ink transition hover:border-ink/20"
        >
          {displayUnit}
        </button>
      </div>
      <div className="space-y-3">
        <PropertyBlock
          title="Crop Mode"
          value={currentCrop?.mode === "preset" ? "Preset Size" : "Free Selection"}
        />
        <PropertyBlock title="Top Margin" value={`${margins.top.toFixed(2)} ${displayUnit}`} />
        <PropertyBlock
          title="Right Margin"
          value={`${margins.right.toFixed(2)} ${displayUnit}`}
        />
        <PropertyBlock
          title="Bottom Margin"
          value={`${margins.bottom.toFixed(2)} ${displayUnit}`}
        />
        <PropertyBlock title="Left Margin" value={`${margins.left.toFixed(2)} ${displayUnit}`} />
      </div>
      <div className="mt-4 rounded-[24px] border border-dashed border-ink/12 bg-panel px-4 py-4 text-sm leading-6 text-ink/65">
        阶段 1 先交付状态结构和布局占位。阶段 3 起这里会接入裁剪模式、预设尺寸、9
        宫格定位和边距输入的真实交互。
      </div>
      <div className="mt-auto grid gap-3 pt-4">
        <button
          type="button"
          className="rounded-full bg-pine px-4 py-3 text-sm font-medium text-white transition hover:bg-pine/90"
        >
          应用到选中页
        </button>
        <button
          type="button"
          className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition hover:border-ink/20"
        >
          应用到全部页面
        </button>
      </div>
    </aside>
  );
}
