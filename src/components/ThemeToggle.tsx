import { usePdfStore } from "@/store/usePdfStore";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeToggle() {
  const theme = usePdfStore((state) => state.theme);
  const setTheme = usePdfStore((state) => state.setTheme);

  const cycle = () => {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      className="rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-sm transition hover:border-ink/25 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
      title={theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"}
    >
      {theme === "light" ? "\u2600" : theme === "dark" ? "\u263E" : "\uD83D\uDDA5"}
    </button>
  );
}
