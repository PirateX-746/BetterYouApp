"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, ExternalLink, FileText, Headset, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { attachmentUrl, formatBytes, type SupportAttachment, type SupportMessage } from "@/lib/support";

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", hour12: true, minute: "2-digit" });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * A ticket's conversation as a chat: the other side on the left, the viewer
 * on the right, day separators, and consecutive messages from one author
 * grouped. `viewer` decides which side reads as "you", so the same component
 * serves the practitioner and the console.
 */
export function TicketThread({ messages, viewer }: { messages: SupportMessage[]; viewer: "requester" | "support" }) {
  return (
    <ol className="space-y-1" aria-label="Conversation">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
        const grouped =
          !newDay && prev && prev.authorName === m.authorName && prev.authorSide === m.authorSide &&
          new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
        const mine = m.authorSide === viewer;
        const isSupport = m.authorSide === "support";
        return (
          <Fragment key={m._id}>
            {newDay && (
              <li role="separator" className="flex items-center gap-3 py-3" aria-label={dayLabel(m.createdAt)}>
                <span className="h-px flex-1 bg-border-light" />
                <span className="rounded-full border border-border-light bg-bg-card px-3 py-1 text-caption font-medium text-text-secondary shadow-xs">
                  {dayLabel(m.createdAt)}
                </span>
                <span className="h-px flex-1 bg-border-light" />
              </li>
            )}
            <li className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${grouped ? "" : "pt-3"}`}>
              {/* Avatar column keeps bubbles aligned when grouped */}
              <span className="w-8 shrink-0" aria-hidden>
                {!grouped && (
                  <span
                    className={`size-8 rounded-full grid place-items-center text-[11px] font-semibold ${
                      isSupport ? "bg-primary/10 text-primary-strong" : "bg-bg-card border border-border text-text-secondary"
                    }`}
                  >
                    {isSupport ? <Headset size={15} /> : initials(m.authorName)}
                  </span>
                )}
              </span>
              <article className={`min-w-0 max-w-[min(42rem,80%)] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                {!grouped && (
                  <header className={`flex flex-wrap items-baseline gap-x-2 mb-1 ${mine ? "justify-end" : ""}`}>
                    <span className="text-footnote font-semibold text-text-primary">{mine ? "You" : m.authorName}</span>
                    {isSupport && !mine && <span className="text-caption text-text-secondary">BetterYou Support</span>}
                    <time dateTime={m.createdAt} className="text-caption text-text-secondary tabular-nums">
                      {timeOf(m.createdAt)}
                    </time>
                  </header>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 shadow-xs ${
                    mine
                      ? `bg-primary text-white ${grouped ? "" : "rounded-tr-md"}`
                      : `bg-bg-card border border-border-light text-text-primary ${grouped ? "" : "rounded-tl-md"}`
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                </div>
                {m.attachments.length > 0 && <MessageAttachments messageId={m._id} attachments={m.attachments} mine={mine} />}
              </article>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

/**
 * Attachments under a message, previewed in the chat: images show inline
 * (click for full size), PDFs as a card that opens in the browser's viewer.
 * Everything can still be downloaded.
 */
function MessageAttachments({
  messageId,
  attachments,
  mine,
}: {
  messageId: string;
  attachments: SupportAttachment[];
  mine: boolean;
}) {
  const [viewing, setViewing] = useState<SupportAttachment | null>(null);
  const images = attachments.filter((a) => a.contentType.startsWith("image/"));
  const files = attachments.filter((a) => !a.contentType.startsWith("image/"));

  return (
    <>
      {images.length > 0 && (
        <ul className={`mt-1.5 flex flex-wrap gap-2 ${mine ? "justify-end" : ""}`} aria-label="Images">
          {images.map((a) => (
            <li key={a._id}>
              <ImagePreview
                src={attachmentUrl(messageId, a._id, { inline: true })}
                fileName={a.fileName}
                onOpen={() => setViewing(a)}
              />
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className={`mt-1.5 flex flex-col gap-2 ${mine ? "items-end" : "items-start"}`} aria-label="Files">
          {files.map((a) => (
            <li key={a._id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-card p-2 pr-3 w-[min(18rem,100%)]">
              <span className="size-10 shrink-0 rounded-lg grid place-items-center bg-danger-light text-danger-strong">
                <FileText size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-text-primary truncate">{a.fileName}</span>
                <span className="block text-[11px] text-text-secondary">PDF · {formatBytes(a.size)}</span>
              </span>
              <a
                href={attachmentUrl(messageId, a._id, { inline: true })}
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 grid place-items-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Preview ${a.fileName}`}
                title="Preview"
              >
                <ExternalLink size={15} aria-hidden />
              </a>
              <a
                href={attachmentUrl(messageId, a._id)}
                download={a.fileName}
                className="size-8 grid place-items-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`Download ${a.fileName}`}
                title="Download"
              >
                <Download size={15} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-[min(64rem,calc(100vw-2rem))] p-3 sm:p-4 gap-3">
          {viewing && (
            <>
              <div className="flex items-center gap-3 pr-8">
                <DialogTitle className="text-sm font-medium truncate flex-1">{viewing.fileName}</DialogTitle>
                <a
                  href={attachmentUrl(messageId, viewing._id)}
                  download={viewing.fileName}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-text-primary hover:bg-bg-hover"
                >
                  <Download size={14} aria-hidden /> Download
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachmentUrl(messageId, viewing._id, { inline: true })}
                alt={viewing.fileName}
                className="max-h-[78vh] w-auto max-w-full mx-auto rounded-lg object-contain bg-bg-subtle"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Inline image in the chat; a file tile if it can't load (no broken icon). */
function ImagePreview({ src, fileName, onOpen }: { src: string; fileName: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex items-center gap-2 rounded-xl border border-border bg-bg-card p-2 pr-3">
        <span className="size-10 rounded-lg grid place-items-center bg-primary/10 text-primary-strong">
          <ImageIcon size={18} aria-hidden />
        </span>
        <span className="text-xs text-text-secondary truncate max-w-[10rem]">{fileName}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block overflow-hidden rounded-xl border border-border bg-bg-subtle hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-opacity cursor-zoom-in"
      aria-label={`View ${fileName}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Attached image ${fileName}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="block max-h-56 max-w-[min(16rem,60vw)] w-auto h-auto object-cover"
      />
    </button>
  );
}

/**
 * Conversation card: the thread scrolls inside, the composer stays pinned
 * at the bottom, and new messages scroll into view.
 */
export function TicketConversation({
  messages,
  viewer,
  composer,
  header,
  className = "",
}: {
  messages: SupportMessage[];
  viewer: "requester" | "support";
  composer: ReactNode;
  /** Pinned above the thread, like a chat app's title bar. */
  header?: ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: messages.length ? "smooth" : "auto" });
  }, [messages.length]);
  return (
    <section aria-label="Ticket conversation" className={`flex flex-col min-h-0 rounded-2xl border border-border/70 bg-bg-card shadow-xs overflow-clip ${className}`}>
      {header && <div className="shrink-0 border-b border-border bg-bg-card">{header}</div>}
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto bg-bg-subtle px-4 md:px-6 pb-5">
        <TicketThread messages={messages} viewer={viewer} />
      </div>
      <div className="border-t border-border bg-bg-card p-3 md:p-4">{composer}</div>
    </section>
  );
}
