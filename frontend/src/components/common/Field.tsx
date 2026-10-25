import type { ReactNode } from "react";

/**
 * Form controls (see DESIGN_SYSTEM.md → Forms). Use these class strings and
 * <Field> instead of redefining a local `fieldCls` in each file.
 *
 *   <Field label="Email" htmlFor="email" required error={errors.email?.message}>
 *     <input id="email" className={inputClass} {...register("email")} />
 *   </Field>
 */

/** Text inputs, selects and date/time inputs: 40px tall, 8px radius. */
export const inputClass =
  "w-full h-10 px-3 text-body bg-bg-card border border-border rounded-md text-text-primary placeholder:text-text-light shadow-xs outline-none transition-[border-color,box-shadow] duration-150 hover:border-text-light/60 focus:border-primary focus:ring-[3px] focus:ring-primary/20 disabled:bg-bg-subtle disabled:text-text-secondary disabled:cursor-not-allowed aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20";

/** Multi-line text: same treatment, auto height. */
export const textareaClass = inputClass.replace("h-10 px-3", "min-h-[5.5rem] px-3 py-2.5 leading-relaxed resize-y");

/** Field label: sentence case, medium weight — not uppercase. */
export const labelClass = "block text-footnote font-medium text-text-primary";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  aside,
  children,
  className = "",
}: {
  label: ReactNode;
  htmlFor?: string;
  /** Helper text under the control (hidden while an error shows). */
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Small trailing content on the label row, e.g. "Open 9–5". */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
          {required && (
            <span className="text-danger-strong ml-0.5" aria-hidden>
              *
            </span>
          )}
        </label>
        {aside && <span className="text-caption text-text-secondary">{aside}</span>}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-danger-strong">
          {error}
        </p>
      ) : (
        hint && <p className="text-caption text-text-secondary">{hint}</p>
      )}
    </div>
  );
}

/** Groups related fields under a quiet heading, e.g. "When" or "Emergency contact". */
export function FieldGroup({
  legend,
  children,
  className = "",
}: {
  legend: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={`space-y-3 ${className}`}>
      <legend className="text-eyebrow font-semibold uppercase text-text-secondary mb-3">{legend}</legend>
      {children}
    </fieldset>
  );
}
