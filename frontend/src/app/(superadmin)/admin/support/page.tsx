"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Search } from "lucide-react";
import {
  PageHeader,
  Panel,
  TableShell,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/containers/superadmin/console-ui";
import {
  NewReplyBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/containers/support/TicketBadges";
import { FaqManager } from "@/components/containers/support/FaqManager";
import { useAsync } from "@/lib/superadmin/api";
import { useSupportLive } from "@/hooks/useSupportLive";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  formatWhen,
  supportAdminApi,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support";

type View = "tickets" | "faqs";
const STATUS_FILTERS: (TicketStatus | "")[] = ["", "open", "in_progress", "resolved", "closed"];

const selectCls =
  "h-11 px-3.5 text-sm bg-bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer";

export default function AdminSupportPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("tickets");
  const [status, setStatus] = useState<TicketStatus | "">("open");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");

  // Debounce the search box so typing doesn't fire a request per key.
  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, loading, error, reload } = useAsync(
    () =>
      supportAdminApi.tickets({
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        q: q || undefined,
      }),
    [status, priority, category, q],
  );

  // New tickets and replies appear without a refresh.
  useSupportLive(() => reload());

  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const tickets = data?.tickets ?? [];
  const filtered = !!(priority || category || q);

  const tab = (v: View, label: string) => (
    <button
      role="tab"
      aria-selected={view === v}
      onClick={() => setView(v)}
      className={`h-11 px-4 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-t-lg ${
        view === v ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        title="Support"
        subtitle={`${counts.open ?? 0} open · ${counts.in_progress ?? 0} in progress · ${total} total`}
      />

      <div role="tablist" aria-label="Support sections" className="flex gap-1 border-b border-border mb-6">
        {tab("tickets", "Tickets")}
        {tab("faqs", "FAQs")}
      </div>

      {view === "faqs" ? (
        <FaqManager />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((s) => {
              const active = status === s;
              const n = s ? counts[s] ?? 0 : total;
              return (
                <button
                  key={s || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(s)}
                  className={`h-11 px-4 rounded-xl border text-sm transition-colors cursor-pointer ${
                    active
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {s ? STATUS_LABEL[s] : "All"}
                  <span className="ml-1.5 tabular-nums opacity-75">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden />
              <label htmlFor="ticket-search" className="sr-only">Search tickets</label>
              <input
                id="ticket-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subject, ticket no., practitioner or practice…"
                className="w-full h-11 pl-10 pr-3.5 text-sm bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <label htmlFor="f-priority" className="sr-only">Priority</label>
            <select id="f-priority" value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | "")} className={selectCls}>
              <option value="">Any priority</option>
              {(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </select>
            <label htmlFor="f-category" className="sr-only">Category</label>
            <select id="f-category" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory | "")} className={selectCls}>
              <option value="">Any category</option>
              {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>

          <Panel title={loading ? "Loading…" : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}>
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : tickets.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={filtered ? "No tickets match these filters" : status ? `No ${STATUS_LABEL[status].toLowerCase()} tickets` : "No tickets yet"}
                hint={filtered ? "Try clearing the search or filters." : undefined}
              />
            ) : (
              <TableShell headers={["Ticket", "From", "Category", "Priority", "Status", "Updated"]}>
                {tickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => router.push(`/admin/support/${t._id}`)}
                    className="hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 max-w-[22rem]">
                      {/* The link is the keyboard/screen-reader path; the row click is a mouse shortcut. */}
                      <a
                        href={`/admin/support/${t._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                      >
                        <span className="block text-xs font-mono text-text-secondary">{t.ticketNo}</span>
                        <span className={`flex items-center gap-2 text-sm text-text-primary ${t.unreadForAdmin ? "font-semibold" : "font-medium"}`}>
                          <span className="truncate">{t.subject}</span>
                          {t.unreadForAdmin && <NewReplyBadge />}
                        </span>
                      </a>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-text-primary">{t.requesterName}</p>
                      <p className="text-xs text-text-secondary">{t.practiceName ?? t.requesterEmail}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">{CATEGORY_LABEL[t.category]}</td>
                    <td className="px-5 py-3.5"><TicketPriorityBadge priority={t.priority} /></td>
                    <td className="px-5 py-3.5"><TicketStatusBadge status={t.status} /></td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">{formatWhen(t.lastMessageAt)}</td>
                  </tr>
                ))}
              </TableShell>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
