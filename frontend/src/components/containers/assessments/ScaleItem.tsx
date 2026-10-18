"use client";

import { useRef, type KeyboardEvent } from "react";
import { EyeOff, MinusCircle } from "lucide-react";
import type { AssessmentResponse, TemplateItem } from "@/lib/assessments";

const inputCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-card border border-border rounded-md text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

/**
 * One 0–10 observation, shown on its own (the workspace asks one question at
 * a time). Segmented buttons instead of a slider: nothing is pre-selected (an
 * untouched item is "blank", never a hidden 5), every value is one tap, and
 * both ends are labelled so the scale direction is explicit. Arrow keys move
 * within the group (ARIA radiogroup, roving tabindex); selecting the current
 * value again clears it. The question text itself is rendered by the caller
 * and referenced through `labelledBy`.
 */
export function ScaleItem({
  item,
  value,
  onChange,
  labelledBy,
  readOnly,
}: {
  item: TemplateItem;
  value: AssessmentResponse | undefined;
  onChange: (next: AssessmentResponse) => void;
  labelledBy: string;
  readOnly?: boolean;
}) {
  const scale = item.scale!;
  const state = value?.state ?? "blank";
  const score = state === "scored" ? value?.score ?? null : null;
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const values = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
  const skipped = state === "not_observed" || state === "not_applicable";

  const set = (patch: Partial<AssessmentResponse>) => onChange({ itemId: item.id, state, score, note: value?.note, ...patch });
  const pick = (n: number) => (score === n ? set({ state: "blank", score: null }) : set({ state: "scored", score: n }));
  const toggleSkip = (s: "not_observed" | "not_applicable") =>
    set(state === s ? { state: "blank", score: null } : { state: s, score: null });

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    const next = Math.min(scale.max, Math.max(scale.min, n + delta));
    set({ state: "scored", score: next });
    btns.current[next - scale.min]?.focus();
  };

  return (
    <div className="space-y-6">
      <div className={skipped ? "opacity-40" : ""}>
        <div role="radiogroup" aria-labelledby={labelledBy} aria-disabled={readOnly} className="grid grid-cols-11 gap-1.5">
          {values.map((n) => {
            const on = score === n;
            return (
              <button
                key={n}
                ref={(el) => {
                  btns.current[n - scale.min] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${n}${n === scale.min ? `, ${scale.lowLabel}` : n === scale.max ? `, ${scale.highLabel}` : ""}`}
                tabIndex={n === (score ?? scale.min) ? 0 : -1}
                disabled={readOnly}
                onClick={() => pick(n)}
                onKeyDown={(e) => onKey(e, n)}
                className={`h-12 sm:h-14 min-w-0 rounded-md text-base font-semibold tabular-nums border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${
                  on
                    ? "bg-primary border-primary text-white shadow-sm"
                    : readOnly
                      ? "bg-bg-page border-border text-text-disabled"
                      : "bg-bg-card border-border text-text-primary hover:border-primary hover:bg-primary/5 cursor-pointer"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between gap-3 text-sm text-text-secondary">
          <span>
            <span className="font-semibold tabular-nums text-text-primary">{scale.min}</span> {scale.lowLabel}
          </span>
          {scale.direction === "higher-is-more" && <span className="hidden md:inline text-xs self-center">Higher = more observed</span>}
          <span className="text-right">
            {scale.highLabel} <span className="font-semibold tabular-nums text-text-primary">{scale.max}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-secondary mr-1">Couldn&apos;t rate it?</span>
        {(["not_observed", "not_applicable"] as const).map((s) => {
          const on = state === s;
          const Icon = s === "not_observed" ? EyeOff : MinusCircle;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              disabled={readOnly}
              onClick={() => toggleSkip(s)}
              className={`h-10 inline-flex items-center gap-2 px-3.5 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default ${
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer"
              }`}
            >
              <Icon size={15} aria-hidden />
              {s === "not_observed" ? "Not observed" : "Not applicable"}
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor={`note-${item.id}`} className="text-sm font-medium text-text-primary">
          Note <span className="font-normal text-text-secondary">(optional)</span>
        </label>
        <input
          id={`note-${item.id}`}
          value={value?.note ?? ""}
          readOnly={readOnly}
          maxLength={500}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="A short observation that explains the rating"
          className={`mt-1.5 h-11 ${inputCls}`}
        />
      </div>
    </div>
  );
}

/** Free-text template item (e.g. follow-up attention points). */
export function TextItem({
  item,
  value,
  onChange,
  labelledBy,
  readOnly,
}: {
  item: TemplateItem;
  value: AssessmentResponse | undefined;
  onChange: (next: AssessmentResponse) => void;
  labelledBy: string;
  readOnly?: boolean;
}) {
  return (
    <textarea
      aria-labelledby={labelledBy}
      value={value?.text ?? ""}
      readOnly={readOnly}
      maxLength={2000}
      rows={6}
      onChange={(e) => onChange({ itemId: item.id, state: e.target.value.trim() ? "scored" : "blank", text: e.target.value })}
      placeholder="Write anything to watch or act on next time."
      className={`${inputCls} leading-relaxed resize-y`}
    />
  );
}
