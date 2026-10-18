import { Badge, type BadgeTone } from "@/components/common/Badge";
import { PRIORITY_LABEL, STATUS_LABEL, type TicketPriority, type TicketStatus } from "@/lib/support";

const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  open: "primary",
  in_progress: "warning",
  resolved: "success",
  closed: "neutral",
};

const PRIORITY_TONE: Record<TicketPriority, BadgeTone> = {
  low: "neutral",
  normal: "teal",
  high: "warning",
  urgent: "danger",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Spelled out ("High priority"), so the color is never the only cue. */
export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]} priority</Badge>;
}

export function NewReplyBadge() {
  return (
    <Badge tone="primary" className="!bg-primary !text-white">
      New reply
    </Badge>
  );
}
