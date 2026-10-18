"use client";

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Shown under the label, e.g. "0 = No visible anxiety · 10 = Very high". */
  hint?: string;
  disabled?: boolean;
}

/**
 * A single 0–10 practitioner-observation score. Built on a native
 * `<input type="range">` rather than typed input — the whole point (see the
 * Session Assessment spec) is a fast tap/drag with the value always visible,
 * never manual number entry.
 */
export function ScoreSlider({ label, value, onChange, hint, disabled }: ScoreSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
          {value}/10
        </span>
      </div>
      {hint && <p className="text-xs text-text-secondary">{hint}</p>}
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-bg-light accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}
