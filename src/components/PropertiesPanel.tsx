import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CropModeSelector } from "@/components/CropModeSelector";
import { MarginInputs } from "@/components/MarginInputs";
import { PresetPositionSelector } from "@/components/PresetPositionSelector";
import { PresetSizeDropdown } from "@/components/PresetSizeDropdown";
import { usePdfStore } from "@/store/usePdfStore";
import { useToastStore } from "@/store/useToastStore";
import { selectCurrentMargins, selectCurrentPageCrop } from "@/store/selectors";
import { createPresetCropRect, marginsToCropRect } from "@/utils/coordinates";
import { findPaperSize } from "@/utils/paperSizes";
import {
  formatUnit,
  fromDisplayUnit,
  toDisplayUnit,
} from "@/utils/unitConversion";
import { detectAutoCrop } from "@/utils/autoCrop";
import type { CropMode, PageMargins, PresetAnchor } from "@/types";
import type { PDFDocumentProxy } from "@/lib/pdfjs";

function PropertyBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-ink/8 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">{title}</div>
      <div className="mt-2 text-sm font-semibold text-ink dark:text-ink-light">{value}</div>
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

interface PropertiesPanelProps {
  documentProxy: PDFDocumentProxy | null;
}

export function PropertiesPanel({ documentProxy }: PropertiesPanelProps) {
  const { t } = useTranslation();
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
  const rotatePage = usePdfStore((state) => state.rotatePage);
  const addToast = useToastStore((state) => state.addToast);

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
  const page = pages[currentPageIndex] ?? null;
  const sourceId = page?.sourceId ?? currentPageIndex;
  const mode: CropMode = currentCrop?.mode ?? "free";
  const presetSizeId = currentCrop?.presetSizeId ?? preferredPresetSizeId;
  const presetAnchor = currentCrop?.presetAnchor ?? preferredPresetAnchor;
  const cropRect = currentCrop?.cropRect ?? null;
  const selectedTargets = selectedPageIndices.length > 0 ? selectedPageIndices : [sourceId];
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const marginSessionRef = useRef(false);
  const [marginValues, setMarginValues] = useState(() =>
    createInputValues(margins, displayUnit),
  );
  const [templateName, setTemplateName] = useState("\u6A21\u677F 1");

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
    setTemplateName(selectedTemplate?.name ?? `\u6A21\u677F ${templates.length + 1}`);
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
      sourceId,
      anchor,
    );

    setPageCropRect(sourceId, nextRect, {
      mode: "preset",
      presetSizeId: sizeId,
      presetAnchor: anchor,
    });
  };

  const handleSaveTemplate = () => {
    const savedId = saveTemplateFromPage(
      sourceId,
      templateName,
      selectedTemplate?.id ?? null,
      t("properties.newTemplate"),
    );

    if (savedId) {
      selectTemplate(savedId);
    }
  };

  const handleCreateTemplate = () => {
    selectTemplate(null);
    setTemplateName(`\u6A21\u677F ${templates.length + 1}`);
  };

  const handleAutoCrop = async (withMargin: boolean) => {
    if (!documentProxy || pages.length === 0) return;
    const targets = selectedPageIndices.length > 0 ? selectedPageIndices : [sourceId];
    pushHistoryCheckpoint();
    const marginPt = withMargin ? 12 : 0;
    const results = await Promise.allSettled(
      targets.map((sid) => detectAutoCrop(documentProxy, sid, marginPt)),
    );
    let applied = 0;
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        const { cropRect, confidence } = result.value;
        if (cropRect && confidence > 0) {
          setPageCropRect(targets[idx], { ...cropRect, pageIndex: targets[idx] });
          applied++;
        }
        if (confidence < 0.5) {
          addToast({
            type: "warning",
            message: t("autoCrop.lowConfidence", { page: pages.findIndex((p) => p.sourceId === targets[idx]) + 1 }),
          });
        }
      }
    });
    addToast({ type: "success", message: t("autoCrop.applied", { count: applied }) });
  };

  const handleModeChange = (nextMode: CropMode) => {
    if (nextMode === "preset") {
      applyPreset(presetSizeId, presetAnchor);
      return;
    }

    setCropMode(sourceId, "free");
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
      sourceId,
    );

    setPageCropRect(sourceId, nextRect, {
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
    <aside className="panel-surface flex min-h-0 flex-col overflow-hidden p-4 md:min-h-[520px] lg:h-[var(--panel-viewport-h)]">
      {/* Fixed header */}
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55 dark:text-ink-light/55">{t("properties.title")}</div>
          <div className="mt-1 text-lg font-semibold text-ink dark:text-ink-light">{t("properties.subtitle")}</div>
        </div>
        <button
          type="button"
          onClick={() => setDisplayUnit(displayUnit === "mm" ? "pt" : "mm")}
          className="rounded-full border border-ink/10 bg-white/75 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
        >
          {displayUnit}
        </button>
      </div>

      {/* Fixed summary area */}
      <div className="mb-4 space-y-3 shrink-0">
        <PropertyBlock
          title={t("properties.currentSelection")}
          value={
            cropRect
              ? `${formatDisplayValue(cropRect.width)} x ${formatDisplayValue(cropRect.height)} ${displayUnit}`
              : t("properties.noCropRect")
          }
        />
        <PropertyBlock
          title={(t as any)("properties.batchRuleLabel")}
          value={(t as any)("properties.batchRuleValue", { count: selectedPageIndices.length })}
        />
      </div>

      {/* Scrollable middle area */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-4">
        <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
            {t("properties.cropModeLabel")}
          </div>
          <CropModeSelector value={mode} onChange={handleModeChange} />
        </div>

        {page && (
          <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
              {t("properties.rotationLabel")}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotatePage(sourceId, -90)}
                disabled={!page}
                className="flex-1 rounded-[16px] border border-ink/10 bg-white/80 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
              >
                ↺ {t("properties.rotateCcw")}
              </button>
              <button
                type="button"
                onClick={() => rotatePage(sourceId, 90)}
                disabled={!page}
                className="flex-1 rounded-[16px] border border-ink/10 bg-white/80 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
              >
                ↻ {t("properties.rotateCw")}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
            {t("autoCrop.label")}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAutoCrop(false)}
              disabled={!documentProxy || !page}
              title={t("autoCrop.autoHint")}
              className="flex-1 rounded-full border border-ink/10 bg-white/80 px-3 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
            >
              {t("autoCrop.auto")}
            </button>
            <button
              type="button"
              onClick={() => handleAutoCrop(true)}
              disabled={!documentProxy || !page}
              title={t("autoCrop.autoMarginHint")}
              className="flex-1 rounded-full border border-ink/10 bg-white/80 px-3 py-2.5 text-sm font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
            >
              {t("autoCrop.autoMargin")}
            </button>
          </div>
          <div className="mt-2 text-xs text-ink/50 dark:text-ink-light/50">
            {t("autoCrop.hint")}
          </div>
        </div>

        <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
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

        <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">{t("properties.templateLabel")}</div>
            <button
              type="button"
              onClick={handleCreateTemplate}
              className="rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
            >
              {t("properties.new")}
            </button>
          </div>
          <div className="space-y-3">
            <label className="block">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
                {t("properties.savedTemplates")}
              </div>
              <select
                value={selectedTemplateId ?? ""}
                onChange={(event) => selectTemplate(event.target.value || null)}
                className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:focus:border-sky-dark"
              >
                <option value="">{t("properties.newTemplate")}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">{t("properties.nameLabel")}</div>
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={t("properties.templateNamePlaceholder")}
                className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:focus:border-sky-dark"
              />
            </label>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={!cropRect}
                className="rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition enabled:hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-ink-light dark:text-mist-dark dark:enabled:hover:bg-ink-light/90"
              >
                {selectedTemplate ? t("properties.updateTemplate") : t("properties.saveTemplate")}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedTemplateId && applyTemplateToPages(selectedTemplateId, [sourceId])
                }
                disabled={!selectedTemplateId || !page}
                className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:enabled:hover:border-white/20 dark:disabled:bg-white/5 dark:disabled:text-ink-light/50"
              >
                {t("properties.applyToCurrent")}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedTemplateId &&
                  applyTemplateToPages(selectedTemplateId, selectedTargets)
                }
                disabled={!selectedTemplateId || selectedTargets.length === 0}
                className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:enabled:hover:border-white/20 dark:disabled:bg-white/5 dark:disabled:text-ink-light/50"
              >
                {t("properties.applyToSelected", { count: selectedTargets.length })}
              </button>
              <button
                type="button"
                onClick={() => selectedTemplateId && deleteTemplate(selectedTemplateId)}
                disabled={!selectedTemplateId}
                className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:enabled:hover:border-white/20 dark:disabled:bg-white/5 dark:disabled:text-ink-light/50"
              >
                {t("properties.deleteTemplate")}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <MarginInputs
            unitLabel={displayUnit}
            values={marginValues}
            onChange={handleMarginChange}
            onCommit={handleMarginCommit}
          />
        </div>

        <div className="grid gap-3">
          <PropertyBlock title={t("properties.marginTop")} value={`${formatDisplayValue(margins.top)} ${displayUnit}`} />
          <PropertyBlock title={t("properties.marginRight")} value={`${formatDisplayValue(margins.right)} ${displayUnit}`} />
          <PropertyBlock title={t("properties.marginBottom")} value={`${formatDisplayValue(margins.bottom)} ${displayUnit}`} />
          <PropertyBlock title={t("properties.marginLeft")} value={`${formatDisplayValue(margins.left)} ${displayUnit}`} />
        </div>

        <div className="rounded-[24px] border border-dashed border-ink/12 bg-panel px-4 py-4 text-sm leading-6 text-ink/65 dark:border-white/10 dark:bg-panel-dark/50 dark:text-ink-light/55">
          {t("properties.marginHint")}
        </div>
      </div>

      {/* Fixed bottom action area */}
      <div className="mt-4 grid gap-3 shrink-0 border-t border-ink/8 pt-4 dark:border-white/10">
        <button
          type="button"
          data-testid="clear-current-page-crop"
          disabled={!cropRect}
          onClick={() => clearPageCrop(sourceId)}
          className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:enabled:hover:border-white/20 dark:disabled:bg-white/5 dark:disabled:text-ink-light/50"
        >
          {t("properties.clearCurrentCrop")}
        </button>
        <button
          type="button"
          data-testid="apply-current-crop-to-selected-pages"
          disabled={!cropRect || selectedTargets.length === 0}
          onClick={() => applyCropToPages(sourceId, selectedTargets)}
          className="rounded-full bg-pine px-4 py-3 text-sm font-medium text-white transition enabled:hover:bg-pine/90 disabled:bg-pine/50 dark:bg-pine-dark"
        >
          {t("properties.applyToSelected", { count: selectedTargets.length })}
        </button>
        <button
          type="button"
          data-testid="apply-current-crop-to-all-pages"
          disabled={!cropRect || pages.length === 0}
          onClick={() => applyCropToPages(sourceId, pages.map((pageItem) => pageItem.sourceId))}
          className="rounded-full border border-ink/12 bg-white px-4 py-3 text-sm font-medium text-ink transition enabled:hover:border-ink/20 disabled:bg-white/70 disabled:text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:enabled:hover:border-white/20 dark:disabled:bg-white/5 dark:disabled:text-ink-light/50"
        >
          {t("properties.applyAll", { count: pages.length })}
        </button>
      </div>
    </aside>
  );
}
