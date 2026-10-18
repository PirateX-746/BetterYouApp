"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { Download, FileText, Headset } from "lucide-react";
import { attachmentUrl, formatBytes, type SupportMessage } from "@/lib/support";

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-text-secondary">{dayLabel(m.createdAt)}</span>
                <span className="h-px flex-1 bg-border" />
              </li>
            )}
            <li className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${grouped ? "" : "pt-3"}`}>
              {/* Avatar column keeps bubbles aligned when grouped */}
              <span className="w-8 shrink-0" aria-hidden>
                {!grouped && (
                  <span
                    className={`size-8 rounded-full grid place-items-center text-[11px] font-semibold ${
                      isSupport ? "bg-primary-light text-primary" : "bg-bg-hover text-text-secondary"
                    }`}
                  >
                    {isSupport ? <Headset size={15} /> : initials(m.authorName)}
                  </span>
                )}
              </span>
              <article className={`min-w-0 max-w-[min(42rem,80%)] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                {!grouped && (
                  <header className={`flex flex-wrap items-baseline gap-x-2 mb-1 ${mine ? "justify-end" : ""}`}>
                    <span className="text-sm font-semibold text-text-primary">{mine ? "You" : m.authorName}</span>
                    {isSupport && !mine && <span className="text-xs text-text-secondary">BetterYou Support</span>}
                    <time dateTime={m.createdAt} className="text-xs text-text-secondary">
                      {timeOf(m.createdAt)}
                    </time>
                  </header>
                )}
                <div
                  className={`rounded-md px-3.5 py-2.5 ${
                    mine ? "bg-primary text-white" : "bg-bg-page border border-border text-text-primary"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                </div>
                {m.attachments.length > 0 && (
                  <ul className={`mt-1.5 flex flex-wrap gap-2 ${mine ? "justify-end" : ""}`} aria-label="Attachments">
                    {m.attachments.map((a) => {
                      const href = attachmentUrl(m._id, a._id);
                      return (
                        <li key={a._id}>
                          <a
                            href={href}
                            download={a.fileName}
                            className="flex items-center gap-2 rounded-md border border-border bg-bg-card p-1.5 pr-3 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                          >
                            {a.contentType.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={href} alt={`Attached image ${a.fileName}`} loading="lazy" className="size-10 rounded object-cover bg-bg-light" />
                            ) : (
                              <span className="size-10 rounded bg-danger-light text-danger grid place-items-center">
                                <FileText size={18} aria-hidden />
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block text-xs font-medium text-text-primary truncate max-w-[10rem]">{a.fileName}</span>
                              <span className="flex items-center gap-1 text-[11px] text-text-secondary">
                                <Download size={11} aria-hidden /> {formatBytes(a.size)}
                              </span>
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </li>
          </Fragment>
        );
      })}
    </ol>
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
  className = "",
}: {
  messages: SupportMessage[];
  viewer: "requester" | "support";
  composer: ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: messages.length ? "smooth" : "auto" });
  }, [messages.length]);
  return (
    <section aria-label="Ticket conversation" className={`flex flex-col min-h-0 rounded-md border border-border bg-bg-card overflow-clip ${className}`}>
      <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-5">
        <TicketThread messages={messages} viewer={viewer} />
      </div>
      <div className="border-t border-border bg-bg-card p-3 md:p-4">{composer}</div>
    </section>
  );
}
