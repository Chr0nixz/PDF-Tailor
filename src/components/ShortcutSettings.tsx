import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_BINDINGS, type ShortcutAction } from "@/hooks/useKeyBindings";

interface ShortcutSettingsProps {
  open: boolean;
  onClose: () => void;
}

const GROUPS: { id: string; label: "shortcuts.groupEdit" | "shortcuts.groupView" | "shortcuts.groupNavigate" | "shortcuts.groupNudge" | "shortcuts.groupOther"; actions: ShortcutAction[] }[] = [
  { id: "edit", label: "shortcuts.groupEdit", actions: ["undo", "redo", "copyCrop", "pasteCrop", "selectAll", "applyCrop", "clearCrop"] },
  { id: "view", label: "shortcuts.groupView", actions: ["zoomIn", "zoomOut", "zoomReset", "togglePreview"] },
  { id: "navigate", label: "shortcuts.groupNavigate", actions: ["prevPage", "nextPage"] },
  { id: "nudge", label: "shortcuts.groupNudge", actions: ["nudgeUp", "nudgeDown", "nudgeLeft", "nudgeRight"] },
  { id: "other", label: "shortcuts.groupOther", actions: ["export", "restoreOrder"] },
];

const KEY_DISPLAY_MAP: Record<string, string> = {
  " ": "Space",
  "ArrowUp": "↑",
  "ArrowDown": "↓",
  "ArrowLeft": "←",
  "ArrowRight": "→",
  "PageUp": "Page Up",
  "PageDown": "Page Down",
  "Enter": "Enter",
  "Delete": "Del",
};

function formatShortcut(key: string | undefined, modifiers?: string[]): string {
  if (!key) return "?";
  const parts: string[] = [];
  if (modifiers?.includes("ctrl")) parts.push("Ctrl");
  if (modifiers?.includes("shift")) parts.push("Shift");
  if (modifiers?.includes("alt")) parts.push("Alt");
  if (modifiers?.includes("meta")) parts.push("⌘");
  parts.push(KEY_DISPLAY_MAP[key] ?? key.toUpperCase());
  return parts.join("+");
}

export function ShortcutSettings({ open, onClose }: ShortcutSettingsProps) {
  const { t } = useTranslation();

  const bindingsByAction = useMemo(() => {
    const map = new Map<string, { key: string; modifiers?: string[] }>();
    for (const binding of DEFAULT_BINDINGS) {
      if (!map.has(binding.id)) {
        map.set(binding.id, { key: binding.key, modifiers: binding.modifiers });
      }
    }
    return map;
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-settings-title"
      className="absolute inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 py-8 backdrop-blur-sm"
    >
      <div className="panel-surface w-full max-w-lg p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div id="shortcut-settings-title" className="text-xs uppercase tracking-[0.22em] text-ink/45">
              {t("settings.keyboardShortcuts")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-medium text-ink"
          >
            {t("header.close")}
          </button>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
          {GROUPS.map((group) => (
            <div key={group.id}>
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-ink/45">
                {t(group.label)}
              </div>
              <div className="space-y-1">
                {group.actions.map((action) => {
                  const binding = bindingsByAction.get(action);
                  if (!binding) return null;
                  return (
                    <div key={action} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-ink dark:text-ink-light">
                        {t(`shortcuts.${action}` as any)}
                      </span>
                      <div className="flex items-center gap-1">
                        {binding.modifiers?.includes("ctrl") && (
                          <kbd className="rounded bg-ink/10 px-1.5 py-0.5 text-xs font-medium text-ink/70 dark:bg-white/10 dark:text-ink-light/70">Ctrl</kbd>
                        )}
                        {binding.modifiers?.includes("shift") && (
                          <kbd className="rounded bg-ink/10 px-1.5 py-0.5 text-xs font-medium text-ink/70 dark:bg-white/10 dark:text-ink-light/70">Shift</kbd>
                        )}
                        {binding.modifiers?.includes("alt") && (
                          <kbd className="rounded bg-ink/10 px-1.5 py-0.5 text-xs font-medium text-ink/70 dark:bg-white/10 dark:text-ink-light/70">Alt</kbd>
                        )}
                        {binding.modifiers?.includes("meta") && (
                          <kbd className="rounded bg-ink/10 px-1.5 py-0.5 text-xs font-medium text-ink/70 dark:bg-white/10 dark:text-ink-light/70">⌘</kbd>
                        )}
                        <kbd className="rounded bg-ink/15 px-1.5 py-0.5 text-xs font-medium text-ink dark:bg-white/15 dark:text-ink-light">
                          {formatShortcut(binding.key, binding.modifiers)}
                        </kbd>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
