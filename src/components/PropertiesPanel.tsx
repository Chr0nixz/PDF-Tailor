import { usePdfStore } from "@/store/usePdfStore";
import { selectCurrentMargins, selectCurrentPageCrop } from "@/store/selectors";
import { formatUnit, ptToMm } from "@/utils/unitConversion";

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
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const pages = usePdfStore((state) => state.pages);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const draftCropRect = usePdfStore((state) => state.draftCropRect);
  const activeDragState = usePdfStore((state) => state.activeDragState);
  const currentCrop = selectCurrentPageCrop(
    currentPageIndex,
    pageCrops,
    draftCropRect,
    activeDragState.pageIndex,
  );
  const margins = selectCurrentMargins(
    currentPageIndex,
    pages,
    pageCrops,
    draftCropRect,
    activeDragState.pageIndex,
  );
  const formatDisplayValue = (valuePt: number) =>
    displayUnit === "mm" ? formatUnit(ptToMm(valuePt)) : formatUnit(valuePt);
  const cropRect = currentCrop?.cropRect ?? null;

  return (
    <aside className="panel-surface flex min-h-[520px] flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Properties</div>
          <div className="mt-1 text-lg font-semibold">Crop controls preview</div>
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
          title="Document state"
          value={documentLoadState === "ready" ? "Ready for crop tools" : documentLoadState}
        />
        <PropertyBlock
          title="Crop Mode"
          value={currentCrop?.mode === "preset" ? "Preset Size" : "Free Selection"}
        />
        <PropertyBlock
          title="Selection"
          value={
            cropRect
              ? `${formatDisplayValue(cropRect.width)} x ${formatDisplayValue(cropRect.height)} ${displayUnit}`
              : "No crop selected"
          }
        />
        <PropertyBlock title="Top Margin" value={`${formatDisplayValue(margins.top)} ${displayUnit}`} />
        <PropertyBlock
          title="Right Margin"
          value={`${formatDisplayValue(margins.right)} ${displayUnit}`}
        />
        <PropertyBlock
          title="Bottom Margin"
          value={`${formatDisplayValue(margins.bottom)} ${displayUnit}`}
        />
        <PropertyBlock title="Left Margin" value={`${formatDisplayValue(margins.left)} ${displayUnit}`} />
      </div>
      <div className="mt-4 rounded-[24px] border border-dashed border-ink/12 bg-panel px-4 py-4 text-sm leading-6 text-ink/65">
        Freeform crop selection is live in this phase. Preset paper sizes, direct
        numeric editing, and batch apply still come later.
      </div>
      <div className="mt-auto grid gap-3 pt-4">
        <button
          type="button"
          disabled
          className="rounded-full bg-pine/50 px-4 py-3 text-sm font-medium text-white"
        >
          Apply to selected pages
        </button>
        <button
          type="button"
          disabled
          className="rounded-full border border-ink/12 bg-white/70 px-4 py-3 text-sm font-medium text-ink/50"
        >
          Apply to all pages
        </button>
      </div>
    </aside>
  );
}
