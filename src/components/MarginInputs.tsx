import { useTranslation } from "react-i18next";

interface MarginInputValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

interface MarginInputsProps {
  unitLabel: string;
  values: MarginInputValues;
  onChange: (side: keyof MarginInputValues, value: string) => void;
  onCommit: (side: keyof MarginInputValues) => void;
}

const SIDE_KEYS: Array<keyof MarginInputValues> = ["top", "right", "bottom", "left"];

export function MarginInputs({
  unitLabel,
  values,
  onChange,
  onCommit,
}: MarginInputsProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">{t("margin.label")}</div>
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-ink/45 dark:text-ink-light/45">
          {unitLabel}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SIDE_KEYS.map((key) => (
          <label key={key} className="block">
            <div className="mb-1 text-xs font-medium text-ink/55 dark:text-ink-light/55">{t(`margin.${key}`)}</div>
            <input
              value={values[key]}
              inputMode="decimal"
              onChange={(event) => onChange(key, event.target.value)}
              onBlur={() => onCommit(key)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onCommit(key);
                }
              }}
              className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky dark:border-white/10 dark:bg-white/5 dark:text-ink-light dark:focus:border-sky-dark"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
