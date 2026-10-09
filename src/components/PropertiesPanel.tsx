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
import { detectTextLayerAutoCrop } from "@/utils/textAutoCrop";
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
  const mirrorMarginsEnabled = usePdfStore((state) => state.mirrorMarginsEnabled);
  const setMirrorMarginsEnabled = usePdfStore((state) => state.setMirrorMarginsEnabled);
  const setPageSplitConfig = usePdfStore((state) => state.setPageSplitConfig);
  const applySplitConfigToPages = usePdfStore((state) => state.applySplitConfigToPages);
  const setPageExclusionBands = usePdfStore((state) => state.setPageExclusionBands);
  const applyExclusionBandsToPages = usePdfStore((state) => state.applyExclusionBandsToPages);
  const addToast = useToastStore((state) => state.addToast);

  const currentCrop = selectCurrentPageCrop(
    currentPageIndex,
    pageCrops,
    draftCropRect,
    activeDragState.pageIndex,
    pages,
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
  const currentSplitConfig = currentCrop?.splitConfig ?? pageCrops[sourceId]?.splitConfig;
  const splitDirection = currentSplitConfig?.direction ?? "none";
  const splitRatio = currentSplitConfig?.splitRatio ?? 0.5;
  const currentExclusionBands = currentCrop?.exclusionBands ?? pageCrops[sourceId]?.exclusionBands;
  const headerPt = currentExclusionBands?.headerPt ?? 0;
  const footerPt = currentExclusionBands?.footerPt ?? 0;
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

  const handleTextAutoCrop = async (withMargin: boolean) => {
    if (!documentProxy || pages.length === 0) return;
    const targets = selectedPageIndices.length > 0 ? selectedPageIndices : [sourceId];
    pushHistoryCheckpoint();
    const marginPt = withMargin ? 12 : 0;
    const results = await Promise.allSettled(
      targets.map((sid) => detectTextLayerAutoCrop(documentProxy, sid, marginPt)),
    );
    let applied = 0;
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        const { cropRect, confidence } = result.value;
        if (cropRect && confidence > 0) {
          setPageCropRect(targets[idx], { ...cropRect, pageIndex: targets[idx] });
          applied++;
        } else {
          addToast({
            type: "warning",
            message: t("autoCrop.noTextFound", {
              page: pages.findIndex((p) => p.sourceId === targets[idx]) + 1,
            }),
          });
        }
      }
    });
    if (applied > 0) {
      addToast({ type: "success", message: t("autoCrop.applied", { count: applied }) });
    }
  };

  const handleExclusionSet = (type: "header" | "footer", valStr: string) => {
    const num = Number.parseFloat(valStr);
    const valPt = Number.isFinite(num) ? fromDisplayUnit(Math.max(0, num), displayUnit) : 0;
    const nextHeader = type === "header" ? valPt : headerPt;
    const nextFooter = type === "footer" ? valPt : footerPt;
    const bands =
      nextHeader > 0 || nextFooter > 0
        ? { headerPt: nextHeader, footerPt: nextFooter }
        : undefined;
    setPageExclusionBands(sourceId, bands);
  };

  const handleExclusionClear = () => {
    setPageExclusionBands(sourceId, undefined);
  };

  const handleApplyExclusionToTargets = (targets: number[]) => {
    applyExclusionBandsToPages(currentExclusionBands, targets);
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

        <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
              {t("properties.columnSplitLabel")}
            </div>
            {splitDirection !== "none" && (
              <span className="rounded-full bg-pine/15 px-2 py-0.5 text-[10px] font-semibold text-pine dark:bg-pine-dark/20 dark:text-pine-dark">
                {splitDirection === "vertical"
                  ? t("properties.splitVerticalShort")
                  : splitDirection === "horizontal"
                  ? t("properties.splitHorizontalShort")
                  : t("properties.splitGridShort")}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(["none", "vertical", "horizontal", "grid"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() =>
                  setPageSplitConfig(
                    sourceId,
                    dir === "none"
                      ? undefined
                      : dir === "grid"
                      ? { direction: "grid", rows: 2, columns: 2, readingOrder: "ltr-ttb", gutterPt: 0 }
                      : { direction: dir, splitRatio: 0.5, gutterPt: 0 },
                  )
                }
                className={`rounded-[12px] border py-2 text-[11px] font-medium transition ${
                  splitDirection === dir
                    ? "border-sky bg-sky/10 text-sky-dark dark:border-sky-dark dark:bg-sky-dark/20 dark:text-sky"
                    : "border-ink/10 bg-white/80 text-ink/70 hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light/70"
                }`}
              >
                {t(`properties.split_${dir}`)}
              </button>
            ))}
          </div>

          {splitDirection !== "none" && (
            <div className="mt-4 space-y-3 border-t border-ink/8 pt-3 dark:border-white/10">
              {splitDirection === "grid" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-ink/50 dark:text-ink-light/50">
                        {t("properties.gridRows")}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={currentSplitConfig?.rows ?? 2}
                        onChange={(e) =>
                          setPageSplitConfig(sourceId, {
                            ...currentSplitConfig,
                            direction: "grid",
                            rows: Math.max(1, Math.min(4, Number.parseInt(e.target.value, 10) || 1)),
                          })
                        }
                        className="w-full rounded-[12px] border border-ink/10 bg-white px-2 py-1 text-xs text-ink outline-none dark:border-white/10 dark:bg-panel-dark dark:text-ink-light"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-ink/50 dark:text-ink-light/50">
                        {t("properties.gridCols")}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={currentSplitConfig?.columns ?? 2}
                        onChange={(e) =>
                          setPageSplitConfig(sourceId, {
                            ...currentSplitConfig,
                            direction: "grid",
                            columns: Math.max(1, Math.min(4, Number.parseInt(e.target.value, 10) || 1)),
                          })
                        }
                        className="w-full rounded-[12px] border border-ink/10 bg-white px-2 py-1 text-xs text-ink outline-none dark:border-white/10 dark:bg-panel-dark dark:text-ink-light"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-ink/50 dark:text-ink-light/50">
                      {t("properties.readingOrder")}
                    </label>
                    <select
                      value={currentSplitConfig?.readingOrder ?? "ltr-ttb"}
                      onChange={(e) =>
                        setPageSplitConfig(sourceId, {
                          ...currentSplitConfig,
                          direction: "grid",
                          readingOrder: e.target.value as any,
                        })
                      }
                      className="w-full rounded-[12px] border border-ink/10 bg-white px-2 py-1 text-xs text-ink outline-none dark:border-white/10 dark:bg-panel-dark dark:text-ink-light"
                    >
                      <option value="ltr-ttb">{t("properties.orderLtrTtb")}</option>
                      <option value="ttb-ltr">{t("properties.orderTtbLtr")}</option>
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { label: "2×2", r: 2, c: 2 },
                      { label: "1×2", r: 1, c: 2 },
                      { label: "2×1", r: 2, c: 1 },
                      { label: "1×3", r: 1, c: 3 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setPageSplitConfig(sourceId, {
                            ...currentSplitConfig,
                            direction: "grid",
                            rows: preset.r,
                            columns: preset.c,
                          })
                        }
                        className="flex-1 rounded-[10px] border border-ink/10 bg-white/70 py-1 text-[11px] font-medium text-ink transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-ink/60 dark:text-ink-light/60">
                    <span>{t("properties.splitRatio")}</span>
                    <span className="font-semibold text-ink dark:text-ink-light">
                      {Math.round(splitRatio * 100)}% / {Math.round((1 - splitRatio) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.02"
                    value={splitRatio}
                    onChange={(e) =>
                      setPageSplitConfig(sourceId, {
                        direction: splitDirection,
                        splitRatio: Number.parseFloat(e.target.value),
                        gutterPt: currentSplitConfig?.gutterPt ?? 0,
                      })
                    }
                    className="w-full accent-pine"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applySplitConfigToPages(currentSplitConfig, selectedTargets)
                  }
                  disabled={selectedTargets.length === 0}
                  className="flex-1 rounded-full border border-ink/12 bg-white py-1.5 text-xs font-medium text-ink transition hover:border-ink/25 dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
                >
                  {t("properties.applySplitToSelected", { count: selectedTargets.length })}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applySplitConfigToPages(
                      currentSplitConfig,
                      pages.map((p) => p.sourceId),
                    )
                  }
                  className="flex-1 rounded-full border border-ink/12 bg-white py-1.5 text-xs font-medium text-ink transition hover:border-ink/25 dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
                >
                  {t("properties.applySplitToAll")}
                </button>
              </div>
            </div>
          )}
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
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAutoCrop(false)}
                disabled={!documentProxy || !page}
                title={t("autoCrop.autoHint")}
                className="flex-1 rounded-full border border-ink/10 bg-white/80 px-2.5 py-2 text-xs font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
              >
                {t("autoCrop.auto")}
              </button>
              <button
                type="button"
                onClick={() => handleAutoCrop(true)}
                disabled={!documentProxy || !page}
                title={t("autoCrop.autoMarginHint")}
                className="flex-1 rounded-full border border-ink/10 bg-white/80 px-2.5 py-2 text-xs font-medium text-ink transition hover:border-ink/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
              >
                {t("autoCrop.autoMargin")}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTextAutoCrop(false)}
                disabled={!documentProxy || !page}
                title={t("autoCrop.textHint")}
                className="flex-1 rounded-full border border-sky/30 bg-sky/10 px-2.5 py-2 text-xs font-medium text-sky-dark transition hover:bg-sky/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-light"
              >
                ⚡ {t("autoCrop.textAuto")}
              </button>
              <button
                type="button"
                onClick={() => handleTextAutoCrop(true)}
                disabled={!documentProxy || !page}
                title={t("autoCrop.textHint")}
                className="flex-1 rounded-full border border-sky/30 bg-sky/10 px-2.5 py-2 text-xs font-medium text-sky-dark transition hover:bg-sky/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-light"
              >
                ⚡ {t("autoCrop.textAutoMargin")}
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-ink/50 dark:text-ink-light/50">
            {t("autoCrop.hint")}
          </div>
        </div>

        <div className="rounded-[24px] border border-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
              {t("properties.exclusionLabel")}
            </div>
            {(headerPt > 0 || footerPt > 0) && (
              <button
                type="button"
                onClick={handleExclusionClear}
                className="text-[11px] font-medium text-ember hover:underline dark:text-ember-light"
              >
                {t("properties.clearExclusion")}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-ink/55 dark:text-ink-light/55">
                  {t("properties.exclusionHeader")} ({displayUnit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formatDisplayValue(headerPt)}
                  onChange={(e) => handleExclusionSet("header", e.target.value)}
                  className="w-full rounded-[14px] border border-ink/10 bg-white/80 px-3 py-1.5 text-xs text-ink outline-none transition focus:border-sky dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-ink/55 dark:text-ink-light/55">
                  {t("properties.exclusionFooter")} ({displayUnit})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formatDisplayValue(footerPt)}
                  onChange={(e) => handleExclusionSet("footer", e.target.value)}
                  className="w-full rounded-[14px] border border-ink/10 bg-white/80 px-3 py-1.5 text-xs text-ink outline-none transition focus:border-sky dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApplyExclusionToTargets(selectedTargets)}
                className="flex-1 rounded-full border border-ink/12 bg-white py-1.5 text-xs font-medium text-ink transition hover:border-ink/25 dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
              >
                {t("properties.applyExclusionToSelected", { count: selectedTargets.length })}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleApplyExclusionToTargets(pages.map((p) => p.sourceId))
                }
                className="flex-1 rounded-full border border-ink/12 bg-white py-1.5 text-xs font-medium text-ink transition hover:border-ink/25 dark:border-white/10 dark:bg-white/5 dark:text-ink-light"
              >
                {t("properties.applyExclusionToAll")}
              </button>
            </div>
            <div className="text-[11px] text-ink/45 dark:text-ink-light/45">
              {t("properties.exclusionHint")}
            </div>
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
        <label className="flex items-center justify-between rounded-[16px] border border-ink/8 bg-white/70 px-3 py-2 cursor-pointer select-none text-xs text-ink/75 transition hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light/75">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              data-testid="mirror-margins-checkbox"
              checked={mirrorMarginsEnabled}
              onChange={(e) => setMirrorMarginsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-ink/20 text-pine accent-pine focus:ring-pine"
            />
            <span>{t("properties.mirrorMargins")}</span>
          </div>
          <span
            title={t("properties.mirrorMarginsTooltip")}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink/10 text-[10px] font-semibold text-ink/60 dark:bg-white/10 dark:text-ink-light/60"
          >
            ?
          </span>
        </label>
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
