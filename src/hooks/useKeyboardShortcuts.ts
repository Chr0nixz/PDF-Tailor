import { useCallback, useEffect } from "react";
import { usePdfStore } from "@/store/usePdfStore";
import {
  DEFAULT_BINDINGS,
  parseKeyEvent,
  type KeyBinding,
} from "@/hooks/useKeyBindings";

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const REVERSE_ZOOM_STEPS = [...ZOOM_STEPS].reverse();

const NUDGE_DIRECTIONS: Record<string, [number, number]> = {
  nudgeUp: [0, -1],
  nudgeDown: [0, 1],
  nudgeLeft: [-1, 0],
  nudgeRight: [1, 0],
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts() {
  const keyBindings = usePdfStore((state) => state.keyBindings);
  const undo = usePdfStore((state) => state.undo);
  const redo = usePdfStore((state) => state.redo);
  const setExportDialogOpen = usePdfStore((state) => state.setExportDialogOpen);
  const goToPrevPage = usePdfStore((state) => state.goToPrevPage);
  const goToNextPage = usePdfStore((state) => state.goToNextPage);
  const selectAllPages = usePdfStore((state) => state.selectAllPages);
  const clearPageCrops = usePdfStore((state) => state.clearPageCrops);
  const copyCrop = usePdfStore((state) => state.copyCrop);
  const pasteCropToPages = usePdfStore((state) => state.pasteCropToPages);
  const applyCropToPages = usePdfStore((state) => state.applyCropToPages);
  const nudgeCrop = usePdfStore((state) => state.nudgeCrop);
  const setPreviewOpen = usePdfStore((state) => state.setPreviewOpen);
  const setZoom = usePdfStore((state) => state.setZoom);
  const zoom = usePdfStore((state) => state.zoom);
  const currentPageIndex = usePdfStore((state) => state.currentPageIndex);
  const selectedPageIndices = usePdfStore((state) => state.selectedPageIndices);
  const draftCropRect = usePdfStore((state) => state.draftCropRect);
  const pageCrops = usePdfStore((state) => state.pageCrops);
  const clearDraftCrop = usePdfStore((state) => state.clearDraftCrop);
  const restoreOriginalOrder = usePdfStore((state) => state.restoreOriginalOrder);
  const pages = usePdfStore((state) => state.pages);

  const hasCropRect = useCallback(
    () => {
      const sourceId = pages[currentPageIndex]?.sourceId;
      return Boolean(draftCropRect ?? (sourceId !== undefined && pageCrops[sourceId]?.cropRect));
    },
    [draftCropRect, pageCrops, currentPageIndex, pages],
  );

  useEffect(() => {
    const bindings: KeyBinding[] = keyBindings ?? DEFAULT_BINDINGS;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const { key, modifiers } = parseKeyEvent(event);

      for (const binding of bindings) {
        if (binding.key.toLowerCase() !== key.toLowerCase()) continue;
        const bindingMods = binding.modifiers ?? [];
        if (bindingMods.length !== modifiers.length) continue;
        if (!bindingMods.every((m) => modifiers.includes(m))) continue;
        event.preventDefault();
        dispatchAction(binding.id, key);
        return;
      }
    };

    function dispatchAction(id: string, key: string) {
      switch (id) {
        case "undo":
          undo();
          break;
        case "redo":
          redo();
          break;
        case "export":
          setExportDialogOpen(true);
          break;
        case "copyCrop": {
          const sourceId = pages[currentPageIndex]?.sourceId;
          if (sourceId !== undefined) copyCrop(sourceId);
          break;
        }
        case "pasteCrop": {
          const sourceId = pages[currentPageIndex]?.sourceId;
          pasteCropToPages(selectedPageIndices.length > 0 ? selectedPageIndices : (sourceId !== undefined ? [sourceId] : []));
          break;
        }
        case "selectAll":
          selectAllPages();
          break;
        case "applyCrop": {
          const sourceId = pages[currentPageIndex]?.sourceId;
          if (!sourceId || !pageCrops[sourceId]?.cropRect) return;
          const targets =
            selectedPageIndices.length > 0 ? selectedPageIndices : (sourceId !== undefined ? [sourceId] : []);
          applyCropToPages(sourceId, targets);
          break;
        }
        case "zoomReset":
          setZoom(1);
          break;
        case "zoomIn": {
          const nextZoom = ZOOM_STEPS.find((step) => step > zoom);
          if (nextZoom !== undefined) setZoom(nextZoom);
          break;
        }
        case "zoomOut": {
          const previousZoom = REVERSE_ZOOM_STEPS.find((step) => step < zoom);
          if (previousZoom !== undefined) setZoom(previousZoom);
          break;
        }
        case "clearCrop": {
          const sourceId = pages[currentPageIndex]?.sourceId;
          const targets =
            selectedPageIndices.length > 1 ? selectedPageIndices : (sourceId !== undefined ? [sourceId] : []);
          clearPageCrops(targets);
          break;
        }
        case "prevPage":
          goToPrevPage();
          break;
        case "nextPage":
          goToNextPage();
          break;
        case "togglePreview":
          setPreviewOpen(true);
          break;
        case "nudgeUp":
        case "nudgeDown":
        case "nudgeLeft":
        case "nudgeRight": {
          if (!hasCropRect()) return;
          const sourceId = pages[currentPageIndex]?.sourceId;
          if (sourceId === undefined) return;
          const [dx, dy] = NUDGE_DIRECTIONS[id] ?? [0, 0];
          nudgeCrop(sourceId, dx, dy);
          break;
        }
        case "restoreOrder":
          restoreOriginalOrder();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    keyBindings,
    undo,
    redo,
    setExportDialogOpen,
    goToPrevPage,
    goToNextPage,
    selectAllPages,
    clearPageCrops,
    copyCrop,
    pasteCropToPages,
    applyCropToPages,
    nudgeCrop,
    setPreviewOpen,
    setZoom,
    zoom,
    currentPageIndex,
    selectedPageIndices,
    draftCropRect,
    pageCrops,
    clearDraftCrop,
    hasCropRect,
    restoreOriginalOrder,
    pages,
  ]);
}
