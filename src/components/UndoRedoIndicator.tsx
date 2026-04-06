import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePdfStore } from "@/store/usePdfStore";
import { useToastStore } from "@/store/useToastStore";

export function UndoRedoIndicator() {
  const { t } = useTranslation();
  const past = usePdfStore((state) => state.past);
  const future = usePdfStore((state) => state.future);
  const lastAction = usePdfStore((state) => state.lastAction);
  const lastUndoneAction = usePdfStore((state) => state.lastUndoneAction);
  const undo = usePdfStore((state) => state.undo);
  const redo = usePdfStore((state) => state.redo);
  const addToast = useToastStore((state) => state.addToast);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    addToast({
      type: "success",
      message: lastUndoneAction
        ? t("history.undone", { action: lastUndoneAction })
        : t("history.undone", { action: "" }),
    });
  }, [canUndo, undo, lastUndoneAction, addToast, t]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    addToast({
      type: "success",
      message: lastAction
        ? t("history.redone", { action: lastAction })
        : t("history.redone", { action: "" }),
    });
  }, [canRedo, redo, lastAction, addToast, t]);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label={t("header.undo")}
        title={t("header.undo")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white/70 text-ink transition hover:border-ink/20 hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20 disabled:dark:opacity-25"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 8h7M3 8l3-3M3 8l3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 4.5a5.5 5.5 0 1 1-1.175 3.712"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label={t("header.redo")}
        title={t("header.redo")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white/70 text-ink transition hover:border-ink/20 hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20 disabled:dark:opacity-25"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13 8h-7M13 8l-3-3M13 8l-3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.5 4.5a5.5 5.5 0 1 0 1.175 3.712"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
