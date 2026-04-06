import { useTranslation } from "react-i18next";
import type { PresetAnchor } from "@/types";

const POSITIONS: Array<{ value: PresetAnchor; label: string }> = [
  { value: "top-left", label: "TL" },
  { value: "top-center", label: "TC" },
  { value: "top-right", label: "TR" },
  { value: "center-left", label: "CL" },
  { value: "center", label: "C" },
  { value: "center-right", label: "CR" },
  { value: "bottom-left", label: "BL" },
  { value: "bottom-center", label: "BC" },
  { value: "bottom-right", label: "BR" },
];

interface PresetPositionSelectorProps {
  value: PresetAnchor;
  onChange: (value: PresetAnchor) => void;
}

export function PresetPositionSelector({
  value,
  onChange,
}: PresetPositionSelectorProps) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
        {t("preset.positionLabel")}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {POSITIONS.map((position) => {
          const active = value === position.value;

          return (
            <button
              key={position.value}
              type="button"
              onClick={() => onChange(position.value)}
              className={`rounded-[16px] px-0 py-3 text-sm font-medium transition ${
                active
                  ? "bg-sky text-white dark:bg-sky-dark dark:text-mist-dark"
                  : "border border-ink/10 bg-white/70 text-ink hover:border-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:hover:border-white/20"
              }`}
            >
              {position.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
