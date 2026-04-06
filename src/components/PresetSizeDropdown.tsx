import { PAPER_SIZES } from "@/utils/paperSizes";

interface PresetSizeDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function PresetSizeDropdown({
  value,
  onChange,
}: PresetSizeDropdownProps) {
  return (
    <label className="block">
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-ink/45">
        预设纸张
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[18px] border border-ink/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition focus:border-sky"
      >
        {PAPER_SIZES.map((size) => (
          <option key={size.id} value={size.id}>
            {size.label}
          </option>
        ))}
      </select>
    </label>
  );
}
