"use client";

import { ChevronLeft, ChevronRight, FileText, Pencil, Trash2 } from "lucide-react";

import type { ScanPage } from "@/lib/scanner/pages";
import {
    DOCUMENT_CATEGORIES,
    MAX_DESCRIPTION_LENGTH,
    MAX_TITLE_LENGTH,
    formatBytes,
    todayIso,
    type DocumentMeta,
    type MetaErrors,
} from "@/lib/scanner/document";

type Props = {
    pages: ScanPage[];
    /** Set instead of `pages` when a ready-made PDF was uploaded from the device. */
    pdf: { url: string; pageCount: number } | null;
    meta: DocumentMeta;
    errors: MetaErrors;
    estimatedBytes: number;
    disabled: boolean;
    onMetaChange: (patch: Partial<DocumentMeta>) => void;
    onEditPage: (id: string) => void;
    onRemovePage: (id: string) => void;
    onMovePage: (id: string, delta: -1 | 1) => void;
};

const inputClass =
    "w-full px-3 py-2.5 rounded-xl border bg-bg-card text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

export default function DocumentReviewPanel({
    pages,
    pdf,
    meta,
    errors,
    estimatedBytes,
    disabled,
    onMetaChange,
    onEditPage,
    onRemovePage,
    onMovePage,
}: Props) {
    const pageCount = pdf ? pdf.pageCount : pages.length;

    return (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 min-h-0">
            {/* Pages */}
            <section aria-label="Pages" className="min-h-0">
                {pdf ? (
                    <iframe src={pdf.url} title="Uploaded PDF preview" className="w-full h-[55dvh] rounded-xl border border-border bg-bg-light" />
                ) : (
                    <ol className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {pages.map((page, i) => (
                            <li key={page.id} className="group rounded-xl border border-border bg-bg-card overflow-hidden">
                                <div className="relative aspect-[3/4] bg-bg-light">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={page.processed.url} alt={`Page ${i + 1}`} className="absolute inset-0 w-full h-full object-contain" />
                                    <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white">
                                        {i + 1}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between px-1.5 py-1.5">
                                    <div className="flex">
                                        <IconButton label={`Move page ${i + 1} earlier`} disabled={disabled || i === 0} onClick={() => onMovePage(page.id, -1)}>
                                            <ChevronLeft size={16} />
                                        </IconButton>
                                        <IconButton label={`Move page ${i + 1} later`} disabled={disabled || i === pages.length - 1} onClick={() => onMovePage(page.id, 1)}>
                                            <ChevronRight size={16} />
                                        </IconButton>
                                    </div>
                                    <div className="flex">
                                        <IconButton label={`Edit page ${i + 1}`} disabled={disabled} onClick={() => onEditPage(page.id)}>
                                            <Pencil size={15} />
                                        </IconButton>
                                        <IconButton label={`Remove page ${i + 1}`} disabled={disabled} onClick={() => onRemovePage(page.id)} danger>
                                            <Trash2 size={15} />
                                        </IconButton>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {/* Details */}
            <section aria-label="Document details" className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-light text-sm">
                    <FileText size={20} className="text-primary shrink-0" />
                    <div>
                        <div className="font-medium text-text-primary">PDF · {pageCount} {pageCount === 1 ? "page" : "pages"}</div>
                        <div className="text-xs text-text-secondary">{pdf ? "" : "Estimated "}size {formatBytes(estimatedBytes)}</div>
                    </div>
                </div>

                <Field id="doc-title" label="Document name" error={errors.title} required>
                    <input
                        id="doc-title"
                        value={meta.title}
                        maxLength={MAX_TITLE_LENGTH}
                        disabled={disabled}
                        onChange={(e) => onMetaChange({ title: e.target.value })}
                        className={`${inputClass} ${errors.title ? "border-danger" : "border-border"}`}
                        aria-invalid={!!errors.title}
                        aria-describedby={errors.title ? "doc-title-error" : undefined}
                    />
                </Field>

                <Field id="doc-category" label="Category" error={errors.category} required>
                    <select
                        id="doc-category"
                        value={meta.category}
                        disabled={disabled}
                        onChange={(e) => onMetaChange({ category: e.target.value as DocumentMeta["category"] })}
                        className={`${inputClass} ${errors.category ? "border-danger" : "border-border"}`}
                        aria-invalid={!!errors.category}
                        aria-describedby={errors.category ? "doc-category-error" : undefined}
                    >
                        <option value="" disabled>Select a category</option>
                        {DOCUMENT_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </Field>

                <Field id="doc-date" label="Document date" error={errors.date} required>
                    <input
                        id="doc-date"
                        type="date"
                        value={meta.date}
                        max={todayIso()}
                        disabled={disabled}
                        onChange={(e) => onMetaChange({ date: e.target.value })}
                        className={`${inputClass} ${errors.date ? "border-danger" : "border-border"}`}
                        aria-invalid={!!errors.date}
                        aria-describedby={errors.date ? "doc-date-error" : undefined}
                    />
                </Field>

                <Field id="doc-description" label="Notes (optional)" error={errors.description}>
                    <textarea
                        id="doc-description"
                        rows={3}
                        value={meta.description}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        disabled={disabled}
                        onChange={(e) => onMetaChange({ description: e.target.value })}
                        className={`${inputClass} resize-none ${errors.description ? "border-danger" : "border-border"}`}
                    />
                </Field>
            </section>
        </div>
    );
}

function Field({ id, label, error, required, children }: { id: string; label: string; error?: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">
                {label}
                {required && <span className="text-danger ml-0.5" aria-hidden>*</span>}
            </label>
            {children}
            {error && <p id={`${id}-error`} className="text-xs text-danger mt-1">{error}</p>}
        </div>
    );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            disabled={disabled}
            className={`w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${danger ? "text-danger hover:bg-danger-light" : "text-text-secondary hover:bg-bg-hover"}`}
        >
            {children}
        </button>
    );
}
