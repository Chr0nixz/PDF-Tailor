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

const SIDES: Array<{ key: keyof MarginInputValues; label: string }> = [
  { key: "top", label: "上" },
  { key: "right", label: "右" },
  { key: "bottom", label: "下" },
  { key: "left", label: "左" },
];

export function MarginInputs({
  unitLabel,
  values,
  onChange,
  onCommit,
}: MarginInputsProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-ink/45">页边距</div>
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-ink/45">
          {unitLabel}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SIDES.map((side) => (
          <label key={side.key} className="block">
            <div className="mb-1 text-xs font-medium text-ink/55">{side.label}</div>
            <input
              value={values[side.key]}
              inputMode="decimal"
              onChange={(event) => onChange(side.key, event.target.value)}
              onBlur={() => onCommit(side.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onCommit(side.key);
                }
              }}
              className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
