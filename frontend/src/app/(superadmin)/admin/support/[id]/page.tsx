"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import { LoadingState, ErrorState } from "@/components/containers/superadmin/console-ui";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, InfoList, InfoRow } from "@/components/common/Card";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { useDetailCrumb } from "@/contexts/PractitionerBreadcrumbContext";
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
  "w-full h-8 px-2 text-sm bg-bg-page border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-50";

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
  useDetailCrumb(ticket?.ticketNo ?? (error ? "Not found" : null));

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

  const finished = ticket.status === "resolved" || ticket.status === "closed";
  const firstName = ticket.requesterName.split(" ")[0];

  return (
    <Page>
      {/* The topbar names the ticket; the subject heads the chat card below. */}
      <PageHeader title={ticket.subject} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] items-start">
        <TicketConversation
          className="h-[calc(100dvh-9.5rem)] min-h-[440px]"
          messages={ticket.messages}
          viewer="support"
          header={
            <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
              <Link
                href="/admin/support"
                aria-label="Back to all tickets"
                title="Back to all tickets"
                className="size-9 shrink-0 grid place-items-center rounded-full text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                <ArrowLeft size={18} aria-hidden />
              </Link>
              <span className="size-10 shrink-0 grid place-items-center rounded-full bg-primary/10 text-primary-strong text-sm font-semibold" aria-hidden>
                {ticket.requesterName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-title-3 font-semibold text-text-primary truncate">{ticket.subject}</h2>
                <p className="text-caption text-text-secondary truncate">
                  <span className="font-mono">{ticket.ticketNo}</span> · {ticket.requesterName}
                  {ticket.practiceName ? ` · ${ticket.practiceName}` : ""}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
            </div>
          }
          composer={
            <ReplyBox
              placeholder={`Reply to ${firstName}…`}
              hint={ticket.status === "open" ? "Replying moves the ticket to In progress." : undefined}
              onSend={async (body, files) => setTicket(await supportAdminApi.reply(id, body, files))}
            />
          }
        />

        <aside className="space-y-4 lg:sticky lg:top-20" aria-label="Ticket details">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <InfoList>
                <InfoRow label="Status">
                  <select
                    aria-label="Status"
                    value={ticket.status}
                    disabled={saving}
                    onChange={(e) => void update({ status: e.target.value as TicketStatus })}
                    className={selectCls}
                  >
                    {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </InfoRow>
                <InfoRow label="Priority">
                  <select
                    aria-label="Priority"
                    value={ticket.priority}
                    disabled={saving}
                    onChange={(e) => void update({ priority: e.target.value as TicketPriority })}
                    className={selectCls}
                  >
                    {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                    ))}
                  </select>
                </InfoRow>
                <InfoRow label="Category">{CATEGORY_LABEL[ticket.category]}</InfoRow>
                <InfoRow label="Opened">{formatWhen(ticket.createdAt)}</InfoRow>
                <InfoRow label="Last update">{formatWhen(ticket.lastMessageAt)}</InfoRow>
                <InfoRow label="Messages"><span className="tabular-nums">{ticket.messages.length}</span></InfoRow>
              </InfoList>
              {!finished && (
                <Button variant="secondary" className="mt-5 w-full" disabled={saving} onClick={() => void update({ status: "resolved" })}>
                  <CheckCircle2 aria-hidden /> Mark resolved
                </Button>
              )}
              {finished && (
                <p className="mt-5 rounded-md bg-bg-subtle px-3 py-2.5 text-footnote text-text-secondary">
                  This ticket is {ticket.status === "resolved" ? "resolved" : "closed"}. A reply from {firstName} reopens it.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Requester" />
            <CardBody>
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
            </CardBody>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
