import { useEffect } from "react";
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (!modifier) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);
}
