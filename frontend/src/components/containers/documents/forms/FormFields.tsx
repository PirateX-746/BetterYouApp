import React from "react";
import type { FieldError } from "react-hook-form";

/* ── Shared field style via Tailwind tokens ── */
const fieldCls =
  "w-full px-3.5 py-2.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition";

export function FormInput({
  label,
  error,
  ...props
}: { label: string; error?: FieldError } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {label}
      </label>
      <input {...props} className={fieldCls} />
      {error && <p className="text-xs text-danger">{error.message}</p>}
    </div>
  );
}

export function FormSelect({
  label,
  options,
  error,
  ...props
}: {
  label: string;
  options: string[];
  error?: FieldError;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {label}
      </label>
      <select
        {...props}
        className={`${fieldCls} ${error ? "border-danger" : ""}`}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error.message}</p>}
    </div>
  );
}

export function FormTextarea({
  label,
  error,
  ...props
}: {
  label?: string;
  error?: FieldError;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        {...props}
        rows={props.rows ?? 3}
        className={`${fieldCls} resize-none ${error ? "border-danger" : ""}`}
      />
      {error && <p className="text-xs text-danger">{error.message}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {children}
    </div>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  );
}

export function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm font-medium text-text-primary mt-0.5">{value}</p>
    </div>
  );
}