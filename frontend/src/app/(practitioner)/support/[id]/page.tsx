"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
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
      <PageHeader
        back={{ href: "/support?tab=tickets", label: "My tickets" }}
        eyebrow={ticket.ticketNo}
        title={ticket.subject}
        subtitle={
          <span className="flex flex-wrap items-center gap-2 mt-1">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </span>
        }
      />

      <div className="flex-1 min-h-0 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <TicketConversation
          className="min-h-[420px]"
          messages={ticket.messages}
          viewer="requester"
          composer={
            <ReplyBox
              onSend={async (body, files) => setTicket(await supportApi.reply(id, body, files))}
              hint={finished ? "Replying reopens this ticket." : undefined}
            />
          }
        />

        <aside className="space-y-4 lg:overflow-y-auto" aria-label="Ticket details">
          <section className="rounded-md border border-border bg-bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">Category</dt><dd className="text-text-primary text-right">{CATEGORY_LABEL[ticket.category]}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">Opened</dt><dd className="text-text-primary text-right">{formatWhen(ticket.createdAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">Last update</dt><dd className="text-text-primary text-right">{formatWhen(ticket.lastMessageAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-text-secondary">Messages</dt><dd className="text-text-primary text-right tabular-nums">{ticket.messages.length}</dd></div>
            </dl>
            {!finished && (
              <button
                type="button"
                onClick={() => setConfirmClose(true)}
                className="mt-4 w-full h-10 inline-flex items-center justify-center gap-2 rounded-md border border-border text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
              >
                <CheckCircle2 size={16} aria-hidden /> My issue is sorted
              </button>
            )}
          </section>
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
