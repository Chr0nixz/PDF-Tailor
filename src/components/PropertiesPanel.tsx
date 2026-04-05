import { useEffect, useMemo, useRef, useState } from "react";
import { CropModeSelector } from "@/components/CropModeSelector";
import { MarginInputs } from "@/components/MarginInputs";
import { PresetPositionSelector } from "@/components/PresetPositionSelector";
import { PresetSizeDropdown } from "@/components/PresetSizeDropdown";
import { usePdfStore } from "@/store/usePdfStore";
import { selectCurrentMargins, selectCurrentPageCrop } from "@/store/selectors";
import { createPresetCropRect, marginsToCropRect } from "@/utils/coordinates";
import { findPaperSize } from "@/utils/paperSizes";
import {
  formatUnit,
  fromDisplayUnit,
  toDisplayUnit,
} from "@/utils/unitConversion";
import type { CropMode, PageMargins, PresetAnchor } from "@/types";

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

function createInputValues(margins: PageMargins, displayUnit: "pt" | "mm") {
  return {
    top: formatUnit(toDisplayUnit(margins.top, displayUnit)),
    right: formatUnit(toDisplayUnit(margins.right, displayUnit)),
    bottom: formatUnit(toDisplayUnit(margins.bottom, displayUnit)),
    left: formatUnit(toDisplayUnit(margins.left, displayUnit)),
  };
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
  const setCropMode = usePdfStore((state) => state.setCropMode);
  const setPageCropRect = usePdfStore((state) => state.setPageCropRect);
  const pushHistoryCheckpoint = usePdfStore((state) => state.pushHistoryCheckpoint);

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
  const page = pages.find((item) => item.pageIndex === currentPageIndex) ?? null;
  const mode: CropMode = currentCrop?.mode ?? "free";
  const presetSizeId = currentCrop?.presetSizeId ?? "a4";
  const presetAnchor = currentCrop?.presetAnchor ?? "center";
  const cropRect = currentCrop?.cropRect ?? null;
  const marginSessionRef = useRef(false);
  const [marginValues, setMarginValues] = useState(() =>
    createInputValues(margins, displayUnit),
  );

  const formatDisplayValue = (valuePt: number) =>
    formatUnit(toDisplayUnit(valuePt, displayUnit));

  useEffect(() => {
    setMarginValues(createInputValues(margins, displayUnit));
    marginSessionRef.current = false;
  }, [
    currentPageIndex,
    displayUnit,
    margins.top,
    margins.right,
    margins.bottom,
    margins.left,
  ]);

  const parseMarginValues = useMemo(
    () =>
      (values: typeof marginValues): PageMargins | null => {
        const top = Number.parseFloat(values.top);
        const right = Number.parseFloat(values.right);
        const bottom = Number.parseFloat(values.bottom);
        const left = Number.parseFloat(values.left);

        if ([top, right, bottom, left].some((value) => Number.isNaN(value) || value < 0)) {
          return null;
        }

        return {
          top: fromDisplayUnit(top, displayUnit),
          right: fromDisplayUnit(right, displayUnit),
          bottom: fromDisplayUnit(bottom, displayUnit),
          left: fromDisplayUnit(left, displayUnit),
        };
      },
    [displayUnit],
  );

  const applyPreset = (sizeId: string, anchor: PresetAnchor) => {
    if (!page) {
      return;
    }

    const size = findPaperSize(sizeId);
    if (!size) {
      return;
    }

    const nextRect = createPresetCropRect(
      size,
      page.widthPt,
      page.heightPt,
      currentPageIndex,
      anchor,
    );

    setPageCropRect(currentPageIndex, nextRect, {
      mode: "preset",
      presetSizeId: sizeId,
      presetAnchor: anchor,
    });
  };

  const handleModeChange = (nextMode: CropMode) => {
    if (nextMode === "preset") {
      applyPreset(presetSizeId, presetAnchor);
      return;
    }

    setCropMode(currentPageIndex, "free");
  };

  const handleMarginChange = (
    side: keyof typeof marginValues,
    value: string,
  ) => {
    const nextValues = {
      ...marginValues,
      [side]: value,
    };

    setMarginValues(nextValues);

    if (!page) {
      return;
    }

    const nextMargins = parseMarginValues(nextValues);
    if (!nextMargins) {
      return;
    }

    if (!marginSessionRef.current) {
      pushHistoryCheckpoint();
      marginSessionRef.current = true;
    }

    const nextRect = marginsToCropRect(
      nextMargins,
      page.widthPt,
      page.heightPt,
      currentPageIndex,
    );

    setPageCropRect(currentPageIndex, nextRect, {
      commitHistory: false,
      mode: "free",
      presetSizeId: null,
      presetAnchor: null,
    });
  };

  const handleMarginCommit = () => {
    setMarginValues(createInputValues(margins, displayUnit));
    marginSessionRef.current = false;
  };

  return (
    <aside className="panel-surface flex min-h-[520px] flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55">Properties</div>
          <div className="mt-1 text-lg font-semibold">Crop controls</div>
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
          title="Selection"
          value={
            cropRect
              ? `${formatDisplayValue(cropRect.width)} x ${formatDisplayValue(cropRect.height)} ${displayUnit}`
              : "No crop selected"
          }
        />
      </div>

      <div className="mt-4 rounded-[24px] border border-ink/8 bg-white/70 p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-ink/45">
          Crop mode
        </div>
        <CropModeSelector value={mode} onChange={handleModeChange} />
      </div>

      <div className="mt-4 rounded-[24px] border border-ink/8 bg-white/70 p-4">
        <div className="space-y-4">
          <PresetSizeDropdown
            value={presetSizeId}
            onChange={(nextValue) => applyPreset(nextValue, presetAnchor)}
          />
          <PresetPositionSelector
            value={presetAnchor}
            onChange={(nextValue) => applyPreset(presetSizeId, nextValue)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-ink/8 bg-white/70 p-4">
        <MarginInputs
          unitLabel={displayUnit}
          values={marginValues}
          onChange={handleMarginChange}
          onCommit={handleMarginCommit}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <PropertyBlock title="Top Margin" value={`${formatDisplayValue(margins.top)} ${displayUnit}`} />
        <PropertyBlock title="Right Margin" value={`${formatDisplayValue(margins.right)} ${displayUnit}`} />
        <PropertyBlock title="Bottom Margin" value={`${formatDisplayValue(margins.bottom)} ${displayUnit}`} />
        <PropertyBlock title="Left Margin" value={`${formatDisplayValue(margins.left)} ${displayUnit}`} />
      </div>

      <div className="mt-4 rounded-[24px] border border-dashed border-ink/12 bg-panel px-4 py-4 text-sm leading-6 text-ink/65">
        Preset paper sizes, 9-point positioning, and numeric margin editing are
        live. Batch apply remains disabled until the multi-page stage.
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
