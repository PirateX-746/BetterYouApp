"use client";

import { useId, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { apiErrorMessage } from "@/lib/api";
import { ATTACHMENT_LIMITS, BODY_MAX, formatBytes } from "@/lib/support";
import { addFiles, FileChips } from "./AttachmentPicker";

/**
 * Chat-style reply composer: one bordered box with an auto-growing text
 * area, pending attachments, and a toolbar (attach · hint · send). Keeps
 * the draft if sending fails.
 */
export function ReplyBox({
  onSend,
  placeholder = "Write a reply…",
  hint,
}: {
  onSend: (body: string, files: File[]) => Promise<void>;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await onSend(body.trim(), files);
      setBody("");
      setFiles([]);
      setFileError(null);
      requestAnimationFrame(grow);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't send your reply. It's still here — try again."));
    } finally {
      setSending(false);
    }
  };

  const limits = `Images or PDFs · up to ${ATTACHMENT_LIMITS.maxFiles} files, ${formatBytes(ATTACHMENT_LIMITS.maxBytes)} each`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      className="rounded-xl border border-border bg-bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition"
    >
      <label htmlFor={id} className="sr-only">
        Reply
      </label>
      <textarea
        id={id}
        ref={area}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          grow();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
        }}
        rows={2}
        maxLength={BODY_MAX}
        placeholder={placeholder}
        disabled={sending}
        className="block w-full px-3.5 pt-3 pb-1 text-sm bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none resize-none leading-relaxed"
      />
      {(files.length > 0 || fileError) && (
        <div className="px-3 pt-2 space-y-1.5">
          <FileChips files={files} onChange={setFiles} disabled={sending} />
          {fileError && (
            <p role="alert" className="text-xs text-danger-strong">
              {fileError}
            </p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={sending || files.length >= ATTACHMENT_LIMITS.maxFiles}
          aria-label={`Attach files. ${limits}`}
          title={limits}
          className="size-9 grid place-items-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Paperclip size={17} aria-hidden />
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ATTACHMENT_LIMITS.accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const { next, error } = addFiles(files, e.target.files);
            setFiles(next);
            setFileError(error);
            e.target.value = "";
          }}
        />
        <p className="flex-1 min-w-0 truncate text-xs text-text-secondary">{hint ?? "Ctrl/⌘ + Enter to send"}</p>
        <Button type="submit" size="sm" className="h-9 px-4" disabled={!body.trim()} loading={sending}>
          {!sending && <Send aria-hidden />}
          Send
        </Button>
      </div>
    </form>
  );
}
