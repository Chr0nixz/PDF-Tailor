import { useTranslation } from "react-i18next";
import type { CropMode } from "@/types";

interface CropModeSelectorProps {
  value: CropMode;
  onChange: (mode: CropMode) => void;
}

export function CropModeSelector({ value, onChange }: CropModeSelectorProps) {
  const { t } = useTranslation();
  const modes: Array<{ value: CropMode; label: string }> = [
    { value: "free", label: t("cropMode.free") },
    { value: "preset", label: t("cropMode.preset") },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {modes.map((mode) => {
        const active = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-ink text-white dark:bg-ink-light dark:text-mist-dark"
                : "border border-ink/10 bg-white/70 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
