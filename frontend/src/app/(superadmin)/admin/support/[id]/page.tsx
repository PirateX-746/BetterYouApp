"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import { LoadingState, ErrorState, Panel } from "@/components/containers/superadmin/console-ui";
import { TicketConversation } from "@/components/containers/support/TicketThread";
import { ReplyBox } from "@/components/containers/support/ReplyBox";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/containers/support/TicketBadges";
import { apiErrorMessage } from "@/lib/api";
import { useSupportLive } from "@/hooks/useSupportLive";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  formatWhen,
  supportAdminApi,
  type SupportTicketDetail,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support";

const selectCls =
  "w-full h-11 px-3.5 text-sm bg-bg-page border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50";

export default function AdminSupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError(null);
    supportAdminApi
      .ticket(id)
      .then(setTicket)
      .catch((err) => setError(apiErrorMessage(err, "Couldn't load this ticket")));
  }, [id]);
  useEffect(load, [load]);
  useSupportLive((e) => {
    if (e.ticketId === id && e.by === "requester") load();
  });

  const update = async (patch: { status?: TicketStatus; priority?: TicketPriority }) => {
    setSaving(true);
    try {
      setTicket(await supportAdminApi.update(id, patch));
      toast.success(patch.status ? `Marked ${STATUS_LABEL[patch.status].toLowerCase()}` : "Priority updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't update the ticket"));
    } finally {
      setSaving(false);
    }
  };

  const back = (
    <Link href="/admin/support" className="inline-flex items-center gap-1.5 h-11 text-sm text-text-secondary hover:text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
      <ArrowLeft size={16} aria-hidden /> All tickets
    </Link>
  );

  if (error) return <>{back}<ErrorState message={error} onRetry={load} /></>;
  if (!ticket) return <LoadingState />;

  return (
    <div className="space-y-5">
      {back}
      <header className="space-y-2">
        <p className="text-xs font-mono text-text-secondary">{ticket.ticketNo}</p>
        <h1 className="text-xl font-semibold text-text-primary break-words">{ticket.subject}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <span>{CATEGORY_LABEL[ticket.category]}</span>
          <span aria-hidden>·</span>
          <span>Opened {formatWhen(ticket.createdAt)}</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-5 items-start">
        <TicketConversation
          className="h-[calc(100dvh-15rem)] min-h-[440px]"
          messages={ticket.messages}
          viewer="support"
          composer={
            <ReplyBox
              placeholder={`Reply to ${ticket.requesterName.split(" ")[0]}…`}
              hint={ticket.status === "open" ? "Replying moves the ticket to In progress." : undefined}
              onSend={async (body, files) => setTicket(await supportAdminApi.reply(id, body, files))}
            />
          }
        />

        <aside className="space-y-4 lg:sticky lg:top-4">
          <Panel title="Ticket" padded>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="t-status" className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Status</label>
                <select id="t-status" value={ticket.status} disabled={saving} onChange={(e) => void update({ status: e.target.value as TicketStatus })} className={selectCls}>
                  {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="t-priority" className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Priority</label>
                <select id="t-priority" value={ticket.priority} disabled={saving} onChange={(e) => void update({ priority: e.target.value as TicketPriority })} className={selectCls}>
                  {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </div>
              {ticket.status !== "resolved" && ticket.status !== "closed" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void update({ status: "resolved" })}
                  className="w-full h-11 rounded-xl border border-success/40 bg-success-light text-success text-sm font-semibold hover:bg-success/15 transition-colors cursor-pointer disabled:opacity-40"
                >
                  Mark resolved
                </button>
              )}
            </div>
          </Panel>

          <Panel title="Requester" padded>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <User size={16} className="text-text-secondary mt-0.5 shrink-0" aria-hidden />
                <div><dt className="sr-only">Name</dt><dd className="text-text-primary">{ticket.requesterName}</dd></div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail size={16} className="text-text-secondary mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <dt className="sr-only">Email</dt>
                  <dd><a href={`mailto:${ticket.requesterEmail}`} className="text-primary hover:underline break-all">{ticket.requesterEmail}</a></dd>
                </div>
              </div>
              {ticket.practiceName && (
                <div className="flex items-start gap-2.5">
                  <Building2 size={16} className="text-text-secondary mt-0.5 shrink-0" aria-hidden />
                  <div><dt className="sr-only">Practice</dt><dd className="text-text-primary">{ticket.practiceName}</dd></div>
                </div>
              )}
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
