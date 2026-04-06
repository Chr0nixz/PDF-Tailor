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
  const preferredPresetSizeId = usePdfStore((state) => state.preferredPresetSizeId);
  const preferredPresetAnchor = usePdfStore((state) => state.preferredPresetAnchor);
  const setPreferredPreset = usePdfStore((state) => state.setPreferredPreset);
  const documentLoadState = usePdfStore((state) => state.documentLoadState);
  const pages = usePdfStore((state) => state.pages);
  const selectedPageIndices = usePdfStore((state) => state.selectedPageIndices);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const draftCropRect = usePdfStore((state) => state.draftCropRect);
  const activeDragState = usePdfStore((state) => state.activeDragState);
  const setCropMode = usePdfStore((state) => state.setCropMode);
  const setPageCropRect = usePdfStore((state) => state.setPageCropRect);
  const pushHistoryCheckpoint = usePdfStore((state) => state.pushHistoryCheckpoint);
  const applyCropToPages = usePdfStore((state) => state.applyCropToPages);
  const clearPageCrop = usePdfStore((state) => state.clearPageCrop);
  const templates = usePdfStore((state) => state.templates);
  const selectedTemplateId = usePdfStore((state) => state.selectedTemplateId);
  const saveTemplateFromPage = usePdfStore((state) => state.saveTemplateFromPage);
  const selectTemplate = usePdfStore((state) => state.selectTemplate);
  const deleteTemplate = usePdfStore((state) => state.deleteTemplate);
  const applyTemplateToPages = usePdfStore((state) => state.applyTemplateToPages);

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
  const presetSizeId = currentCrop?.presetSizeId ?? preferredPresetSizeId;
  const presetAnchor = currentCrop?.presetAnchor ?? preferredPresetAnchor;
  const cropRect = currentCrop?.cropRect ?? null;
  const selectedTargets = selectedPageIndices.length > 0 ? selectedPageIndices : [currentPageIndex];
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const marginSessionRef = useRef(false);
  const [marginValues, setMarginValues] = useState(() =>
    createInputValues(margins, displayUnit),
  );
  const [templateName, setTemplateName] = useState("Template 1");

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

  useEffect(() => {
    setTemplateName(selectedTemplate?.name ?? `Template ${templates.length + 1}`);
  }, [selectedTemplate?.id, selectedTemplate?.name, templates.length]);

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

    setPreferredPreset(sizeId, anchor);
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

  const handleSaveTemplate = () => {
    const savedId = saveTemplateFromPage(
      currentPageIndex,
      templateName,
      selectedTemplate?.id ?? null,
    );

    if (savedId) {
      selectTemplate(savedId);
    }
  };

  const handleCreateTemplate = () => {
    selectTemplate(null);
    setTemplateName(`Template ${templates.length + 1}`);
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
    <aside className="panel-surface flex min-h-0 min-h-[520px] flex-col overflow-auto p-4">
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
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Templates</div>
          <button
            type="button"
            onClick={handleCreateTemplate}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink transition hover:border-ink/20"
          >
            New
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
              Saved template
            </div>
            <select
              value={selectedTemplateId ?? ""}
              onChange={(event) => selectTemplate(event.target.value || null)}
              className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky"
            >
              <option value="">New template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">Name</div>
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
              className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky"
            />
          </label>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!cropRect}
              className="rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition enabled:hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedTemplate ? "Update selected template" : "Save as template"}
            </button>
            <button
              type="button"
              onClick={() =>
                selectedTemplateId && applyTemplateToPages(selectedTemplateId, [currentPageIndex])
              }
              disabled={!selectedTemplateId || !page}
              className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50"
            >
              Apply template to current page
            </button>
            <button
              type="button"
              onClick={() =>
                selectedTemplateId &&
                applyTemplateToPages(selectedTemplateId, selectedTargets)
              }
              disabled={!selectedTemplateId || selectedTargets.length === 0}
              className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50"
            >
              Apply template to selected pages ({selectedTargets.length})
            </button>
            <button
              type="button"
              onClick={() => selectedTemplateId && deleteTemplate(selectedTemplateId)}
              disabled={!selectedTemplateId}
              className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50"
            >
              Delete selected template
            </button>
          </div>
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
        live. Use "Apply to selected" or "Apply to all" to batch-apply crops.
      </div>

      <div className="mt-auto grid gap-3 pt-4">
        <button
          type="button"
          disabled={!cropRect}
          onClick={() => clearPageCrop(currentPageIndex)}
          className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50"
        >
          Clear current page crop
        </button>
        <button
          type="button"
          disabled={!cropRect || selectedTargets.length === 0}
          onClick={() => applyCropToPages(currentPageIndex, selectedTargets)}
          className="rounded-full bg-pine px-4 py-3 text-sm font-medium text-white transition enabled:hover:bg-pine/90 disabled:bg-pine/50"
        >
          Apply to selected pages ({selectedTargets.length})
        </button>
        <button
          type="button"
          disabled={!cropRect || pages.length === 0}
          onClick={() => applyCropToPages(currentPageIndex, pages.map((pageItem) => pageItem.pageIndex))}
          className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50"
        >
          Apply to all pages ({pages.length})
        </button>
      </div>
    </aside>
  );
}
