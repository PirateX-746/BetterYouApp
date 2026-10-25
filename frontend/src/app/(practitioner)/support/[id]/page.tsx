"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, InfoList, InfoRow } from "@/components/common/Card";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { useDetailCrumb } from "@/contexts/PractitionerBreadcrumbContext";
import { useSupportLive } from "@/hooks/useSupportLive";
import toast from "react-hot-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { TicketConversation } from "@/components/containers/support/TicketThread";
import { ReplyBox } from "@/components/containers/support/ReplyBox";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/containers/support/TicketBadges";
import { apiErrorMessage } from "@/lib/api";
import { CATEGORY_LABEL, formatWhen, supportApi, type SupportTicketDetail } from "@/lib/support";

export default function SupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    supportApi
      .ticket(id)
      .then(setTicket)
      .catch(() => setNotFound(true));
  }, [id]);
  useEffect(load, [load]);
  // Support replied or changed the status: show it without a reload.
  useSupportLive((e) => {
    if (e.ticketId === id && e.by === "support") load();
  });
  useDetailCrumb(ticket?.ticketNo ?? (notFound ? "Not found" : null));

  const close = async () => {
    setClosing(true);
    try {
      setTicket(await supportApi.close(id));
      toast.success("Ticket closed");
      setConfirmClose(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't close the ticket"));
    } finally {
      setClosing(false);
    }
  };

  if (notFound) {
    return (
      <Page>
        <PageHeader title="Ticket not found" back={{ href: "/support?tab=tickets", label: "My tickets" }} />
        <div className="rounded-2xl border border-border bg-bg-card p-8 text-center">
          <p className="text-sm text-text-secondary">It may have been removed, or the link is wrong.</p>
        </div>
      </Page>
    );
  }
  if (!ticket) return <LoadingState size="lg" />;

  const finished = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <Page fill>
      {/* The topbar names the ticket; the subject heads the chat card below. */}
      <PageHeader title={ticket.subject} />

      <div className="flex-1 min-h-0 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <TicketConversation
          className="min-h-[420px]"
          messages={ticket.messages}
          viewer="requester"
          header={
            <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
              <Link
                href="/support?tab=tickets"
                aria-label="Back to my tickets"
                title="Back to my tickets"
                className="size-9 shrink-0 grid place-items-center rounded-full text-text-secondary hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
              >
                <ArrowLeft size={18} aria-hidden />
              </Link>
              <span className="size-10 shrink-0 grid place-items-center rounded-full bg-primary/10 text-primary-strong" aria-hidden>
                <Headset size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-title-3 font-semibold text-text-primary truncate">{ticket.subject}</h2>
                <p className="text-caption text-text-secondary truncate">
                  <span className="font-mono">{ticket.ticketNo}</span> · BetterYou Support
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
              onSend={async (body, files) => setTicket(await supportApi.reply(id, body, files))}
              hint={finished ? "Replying reopens this ticket." : undefined}
            />
          }
        />

        <aside className="space-y-4 lg:overflow-y-auto" aria-label="Ticket details">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <InfoList>
                <InfoRow label="Status"><TicketStatusBadge status={ticket.status} /></InfoRow>
                <InfoRow label="Priority"><TicketPriorityBadge priority={ticket.priority} /></InfoRow>
                <InfoRow label="Category">{CATEGORY_LABEL[ticket.category]}</InfoRow>
                <InfoRow label="Opened">{formatWhen(ticket.createdAt)}</InfoRow>
                <InfoRow label="Last update">{formatWhen(ticket.lastMessageAt)}</InfoRow>
                <InfoRow label="Messages"><span className="tabular-nums">{ticket.messages.length}</span></InfoRow>
              </InfoList>
              {!finished && (
                <Button variant="secondary" className="mt-5 w-full" onClick={() => setConfirmClose(true)}>
                  <CheckCircle2 aria-hidden /> My issue is sorted
                </Button>
              )}
              {finished && (
                <p className="mt-5 rounded-md bg-bg-subtle px-3 py-2.5 text-footnote text-text-secondary">
                  This ticket is {ticket.status === "resolved" ? "resolved" : "closed"}. Reply to reopen it.
                </p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      <ConfirmationDialog
        open={confirmClose}
        onClose={() => !closing && setConfirmClose(false)}
        onConfirm={() => void close()}
        title="Close this ticket?"
        description="You can still reply later — that reopens it."
        confirmLabel="Close ticket"
        loading={closing}
      />
    </Page>
  );
}
