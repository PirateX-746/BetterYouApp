"use client";

import { useId, useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { ATTACHMENT_LIMITS, formatBytes } from "@/lib/support";

const ALLOWED = ATTACHMENT_LIMITS.accept.split(",");

/** Adds picked files to `current`, enforcing type, size and count. */
export function addFiles(current: File[], picked: FileList | null): { next: File[]; error: string | null } {
  const next = [...current];
  let error: string | null = null;
  for (const f of Array.from(picked ?? [])) {
    if (!ALLOWED.includes(f.type)) {
      error = `${f.name}: only PNG, JPEG, WebP images and PDFs can be attached.`;
      continue;
    }
    if (f.size > ATTACHMENT_LIMITS.maxBytes) {
      error = `${f.name} is larger than ${formatBytes(ATTACHMENT_LIMITS.maxBytes)}.`;
      continue;
    }
    if (next.length >= ATTACHMENT_LIMITS.maxFiles) {
      error = `You can attach up to ${ATTACHMENT_LIMITS.maxFiles} files.`;
      break;
    }
    next.push(f);
  }
  return { next, error };
}

/** Removable chips for files waiting to be sent. */
export function FileChips({ files, onChange, disabled }: { files: File[]; onChange: (f: File[]) => void; disabled?: boolean }) {
  if (!files.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Files to attach">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="flex items-center gap-2 pl-3 pr-1 h-9 rounded-md bg-bg-page border border-border text-xs text-text-primary max-w-full">
          {f.type.startsWith("image/") ? (
            <ImageIcon size={14} className="text-text-secondary shrink-0" aria-hidden />
          ) : (
            <FileText size={14} className="text-text-secondary shrink-0" aria-hidden />
          )}
          <span className="truncate max-w-[12rem]">{f.name}</span>
          <span className="text-text-secondary shrink-0">{formatBytes(f.size)}</span>
          <button
            type="button"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            disabled={disabled}
            aria-label={`Remove ${f.name}`}
            className="w-7 h-7 flex items-center justify-center rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer"
          >
            <X size={14} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * File chooser for ticket attachments. Checks count, size and type up front
 * for quick feedback; the server re-checks everything from the file bytes.
 */
export function AttachmentPicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);

  const add = (picked: FileList | null) => {
    if (!picked?.length) return;
    const { next, error: err } = addFiles(files, picked);
    setError(err);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || files.length >= ATTACHMENT_LIMITS.maxFiles}
          aria-describedby={error ? errorId : undefined}
          className="h-11 inline-flex items-center gap-2 px-3.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Paperclip size={16} aria-hidden />
          Attach files
        </button>
        <span className="text-xs text-text-secondary">
          Screenshots or PDFs · up to {ATTACHMENT_LIMITS.maxFiles} files, {formatBytes(ATTACHMENT_LIMITS.maxBytes)} each
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_LIMITS.accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => add(e.target.files)}
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger-strong">
          {error}
        </p>
      )}

      <FileChips files={files} onChange={onChange} disabled={disabled} />
    </div>
  );
}
