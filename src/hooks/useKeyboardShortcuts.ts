import { useCallback, useEffect } from "react";
import { usePdfStore } from "@/store/usePdfStore";

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
  const undo = usePdfStore((state) => state.undo);
  const redo = usePdfStore((state) => state.redo);
  const setExportDialogOpen = usePdfStore((state) => state.setExportDialogOpen);
  const goToPrevPage = usePdfStore((state) => state.goToPrevPage);
  const goToNextPage = usePdfStore((state) => state.goToNextPage);
  const selectAllPages = usePdfStore((state) => state.selectAllPages);
  const clearPageCrop = usePdfStore((state) => state.clearPageCrop);
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

  const hasCropRect = useCallback(
    () => Boolean(draftCropRect ?? pageCrops[currentPageIndex]?.cropRect),
    [draftCropRect, pageCrops, currentPageIndex],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (modifier && ((key === "z" && event.shiftKey) || key === "y")) {
        event.preventDefault();
        redo();
        return;
      }

      if (modifier && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (modifier && key === "s") {
        event.preventDefault();
        setExportDialogOpen(true);
        return;
      }

      if (modifier && key === "c") {
        event.preventDefault();
        copyCrop(currentPageIndex);
        return;
      }

      if (modifier && key === "v") {
        event.preventDefault();
        const targets =
          selectedPageIndices.length > 0 ? selectedPageIndices : [currentPageIndex];
        pasteCropToPages(targets);
        return;
      }

      if (modifier && key === "a") {
        event.preventDefault();
        selectAllPages();
        return;
      }

      if (modifier && key === "enter") {
        event.preventDefault();
        const source = pageCrops[currentPageIndex];
        if (!source?.cropRect) {
          return;
        }

        const targets =
          selectedPageIndices.length > 0 ? selectedPageIndices : [currentPageIndex];
        applyCropToPages(currentPageIndex, targets);
        return;
      }

      if (modifier && key === "0") {
        event.preventDefault();
        setZoom(1);
        return;
      }

      const zoomSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
      if (modifier && (key === "=" || key === "+")) {
        event.preventDefault();
        const nextZoom = zoomSteps.find((step) => step > zoom);
        if (nextZoom !== undefined) {
          setZoom(nextZoom);
        }
        return;
      }

      if (modifier && key === "-") {
        event.preventDefault();
        const previousZoom = [...zoomSteps].reverse().find((step) => step < zoom);
        if (previousZoom !== undefined) {
          setZoom(previousZoom);
        }
        return;
      }

      if (key === "escape" && draftCropRect) {
        event.preventDefault();
        clearDraftCrop();
        return;
      }

      if (!modifier && (key === "delete" || key === "backspace")) {
        event.preventDefault();
        clearPageCrop(currentPageIndex);
        return;
      }

      if (!modifier && key === "pageup") {
        event.preventDefault();
        goToPrevPage();
        return;
      }

      if (!modifier && key === "pagedown") {
        event.preventDefault();
        goToNextPage();
        return;
      }

      if (!modifier && key === "tab") {
        event.preventDefault();
        if (event.shiftKey) {
          goToPrevPage();
        } else {
          goToNextPage();
        }
        return;
      }

      if (!modifier && key === " ") {
        event.preventDefault();
        setPreviewOpen(true);
        return;
      }

      if (!modifier && key.startsWith("arrow")) {
        if (!hasCropRect()) {
          return;
        }

        const nudgeSize = event.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        if (key === "arrowup") {
          dy = -nudgeSize;
        }
        if (key === "arrowdown") {
          dy = nudgeSize;
        }
        if (key === "arrowleft") {
          dx = -nudgeSize;
        }
        if (key === "arrowright") {
          dx = nudgeSize;
        }

        if (dx !== 0 || dy !== 0) {
          event.preventDefault();
          nudgeCrop(currentPageIndex, dx, dy);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    applyCropToPages,
    clearDraftCrop,
    clearPageCrop,
    copyCrop,
    currentPageIndex,
    draftCropRect,
    goToNextPage,
    goToPrevPage,
    hasCropRect,
    nudgeCrop,
    pageCrops,
    pasteCropToPages,
    redo,
    selectAllPages,
    selectedPageIndices,
    setExportDialogOpen,
    setPreviewOpen,
    setZoom,
    undo,
    zoom,
  ]);
}
