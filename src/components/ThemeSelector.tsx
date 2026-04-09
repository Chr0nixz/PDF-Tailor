import { useState } from "react";
import { usePdfStore } from "@/store/usePdfStore";
import type { ThemeName } from "@/types";

const THEMES: { id: ThemeName; label: string; icon: string }[] = [
  { id: "paper", label: "Paper", icon: "☀️" },
  { id: "midnight", label: "Midnight", icon: "🌙" },
  { id: "warm", label: "Warm", icon: "🍂" },
  { id: "high-contrast", label: "High Contrast", icon: "◐" },
];

export function ThemeSelector() {
  const themeName = usePdfStore((state) => state.themeName);
  const setThemeName = usePdfStore((state) => state.setThemeName);
  const [open, setOpen] = useState(false);

  const currentTheme = THEMES.find((t) => t.id === themeName) ?? THEMES[0];

  const handleSelect = (id: ThemeName) => {
    setThemeName(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-sm transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {currentTheme.icon}
      </button>
      {open && (
        <div
          role="listbox"
          className="panel-surface absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden p-2"
        >
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              role="option"
              aria-selected={themeName === theme.id}
              onClick={() => handleSelect(theme.id)}
              className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left text-sm"
            >
              <span>{theme.icon}</span>
              <span className="flex-1">{theme.label}</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
