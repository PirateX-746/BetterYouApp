"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Inbox,
  LifeBuoy,
  Plus,
  Search,
  SearchX,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { Segmented } from "@/components/common/Tabs";
import { inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { useSupportLive } from "@/hooks/useSupportLive";
import { LoadingState } from "@/components/ui/loading-state";
import { NewTicketDialog } from "@/components/containers/support/NewTicketDialog";
import {
  NewReplyBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/containers/support/TicketBadges";
import {
  CATEGORY_LABEL,
  formatWhen,
  supportApi,
  type Faq,
  type SupportTicket,
} from "@/lib/support";

type View = "help" | "tickets";

/** Icon per FAQ category; anything the admin invents falls back to a "?" */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  "Account & security": ShieldCheck,
  Appointments: CalendarCheck,
  "Patients & documents": FileText,
  Schedule: Clock,
  Support: LifeBuoy,
};
const iconFor = (category: string) => CATEGORY_ICON[category] ?? HelpCircle;

const QUICK_SEARCHES = ["booking", "appointment types", "scan", "password"];

/* ─── Help center (search + FAQs) ─── */

function HelpCenter({ faqs, onAsk }: { faqs: Faq[]; onAsk: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of faqs) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [faqs]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter(
      (f) =>
        (!category || f.category === category) &&
        (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)),
    );
  }, [faqs, query, category]);

  const searching = !!query.trim();

  return (
    <div className="space-y-5 min-w-0">
      {/* Search */}
      <section
        aria-label="Search help"
        className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 md:p-6"
      >
        <h2 className="text-base font-semibold text-text-primary">How can we help?</h2>
        <p className="text-sm text-text-secondary mt-0.5">Search the guides, or browse by topic below.</p>
        <div className="relative mt-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden />
          <label htmlFor="faq-search" className="sr-only">Search help articles</label>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. how do I reschedule an appointment?"
            className="w-full h-12 pl-11 pr-4 text-sm bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-disabled shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-text-secondary">Popular:</span>
          {QUICK_SEARCHES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuery(q)}
              className="h-8 px-3 rounded-full bg-bg-card border border-border text-xs text-text-secondary hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Category filter */}
      <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={category === null}
          onClick={() => setCategory(null)}
          className={chipCls(category === null)}
        >
          All topics <span className="tabular-nums opacity-70">{faqs.length}</span>
        </button>
        {categories.map(([c, n]) => {
          const Icon = iconFor(c);
          return (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chipCls(category === c)}>
              <Icon size={15} aria-hidden /> {c} <span className="tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center space-y-3">
          <SearchX className="mx-auto text-text-disabled" size={28} aria-hidden />
          <p className="text-sm font-medium text-text-primary">
            {searching ? <>No answers for “{query.trim()}”</> : "No articles in this topic yet"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="h-11 px-4 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover cursor-pointer"
            >
              Clear filters
            </button>
            <button type="button" onClick={onAsk} className="h-11 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover cursor-pointer">
              Ask support instead
            </button>
          </div>
        </div>
      ) : (
        <ul className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden" aria-label="Help articles">
          {results.map((f) => {
            const Icon = iconFor(f.category);
            return (
              <li key={f._id}>
                {/* Native disclosure: keyboard- and screen-reader-accessible for free. */}
                <details className="group" open={searching}>
                  <summary className="flex items-center gap-4 px-5 min-h-[56px] py-3 cursor-pointer list-none hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 transition-colors border-l-[3px] border-transparent group-open:border-primary [&::-webkit-details-marker]:hidden">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon size={17} aria-hidden />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-text-primary">{f.question}</span>
                      {!category && <span className="block text-xs text-text-secondary mt-0.5">{f.category}</span>}
                    </span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-text-secondary transition-transform duration-200 group-open:rotate-180 group-open:text-primary motion-reduce:transition-none"
                      aria-hidden
                    />
                  </summary>
                  <div className="border-l-[3px] border-primary bg-bg-page px-5 py-4 pl-[4.75rem]">
                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-w-prose">{f.answer}</p>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function chipCls(active: boolean) {
  return `h-10 inline-flex items-center gap-2 px-3.5 rounded-xl border text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
    active
      ? "border-primary bg-primary/10 text-primary font-medium"
      : "border-border bg-bg-card text-text-secondary hover:text-text-primary hover:bg-bg-hover"
  }`;
}

/* ─── Sidebar ─── */

function ContactCard({ onNew }: { onNew: () => void }) {
  return (
    <section aria-labelledby="contact-title" className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <LifeBuoy size={20} aria-hidden />
        </span>
        <div>
          <h2 id="contact-title" className="text-sm font-semibold text-text-primary">Still need help?</h2>
          <p className="text-sm text-text-secondary mt-0.5">Our team reads every ticket. Attach screenshots to help us help you faster.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors cursor-pointer"
      >
        <Plus size={16} aria-hidden /> Raise a ticket
      </button>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-bg-page border border-border px-3 py-2.5">
          <dt className="text-text-secondary">Urgent</dt>
          <dd className="font-semibold text-text-primary mt-0.5">Within 4 business hrs</dd>
        </div>
        <div className="rounded-xl bg-bg-page border border-border px-3 py-2.5">
          <dt className="text-text-secondary">Everything else</dt>
          <dd className="font-semibold text-text-primary mt-0.5">Within 1 business day</dd>
        </div>
      </dl>
    </section>
  );
}

function RecentTickets({ tickets, onViewAll }: { tickets: SupportTicket[]; onViewAll: () => void }) {
  const recent = tickets.slice(0, 4);
  return (
    <section aria-labelledby="recent-title" className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 id="recent-title" className="text-sm font-semibold text-text-primary">Your tickets</h2>
        {tickets.length > 0 && (
          <button type="button" onClick={onViewAll} className="text-xs font-medium text-primary hover:underline cursor-pointer">
            View all ({tickets.length})
          </button>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-text-secondary text-center">No tickets yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((t) => (
            <li key={t._id}>
              <Link href={`/support/${t._id}`} className="block px-5 py-3 hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 transition-colors">
                <span className="flex items-center gap-2">
                  {t.unreadForRequester && <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-label="New reply" />}
                  <span className={`text-sm truncate ${t.unreadForRequester ? "font-semibold" : "font-medium"} text-text-primary`}>{t.subject}</span>
                </span>
                <span className="flex items-center gap-2 mt-1.5">
                  <TicketStatusBadge status={t.status} />
                  <span className="text-xs text-text-secondary">{formatWhen(t.lastMessageAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Full ticket list ─── */

/* Workflow order, not alphabetical, so "sort by priority/status" reads naturally. */
const PRIORITY_RANK: Record<SupportTicket["priority"], number> = { low: 0, normal: 1, high: 2, urgent: 3 };
const STATUS_RANK: Record<SupportTicket["status"], number> = { open: 0, in_progress: 1, resolved: 2, closed: 3 };

const TICKET_COLUMNS: DataTableColumn<SupportTicket>[] = [
  {
    key: "ticket",
    header: "Ticket",
    width: "40%",
    sortValue: (t) => t.ticketNo,
    render: (t) => (
      <div className="min-w-0">
        <p className="text-xs font-mono text-text-secondary">{t.ticketNo}</p>
        <p className="flex items-center gap-2 min-w-0">
          <span className={`text-sm truncate text-text-primary group-hover:text-primary ${t.unreadForRequester ? "font-semibold" : "font-medium"}`}>
            {t.subject}
          </span>
          {t.unreadForRequester && <NewReplyBadge />}
        </p>
      </div>
    ),
  },
  { key: "category", header: "Category", width: "16%", sortValue: (t) => CATEGORY_LABEL[t.category], render: (t) => <span className="text-sm text-text-secondary">{CATEGORY_LABEL[t.category]}</span> },
  { key: "priority", header: "Priority", width: "14%", sortValue: (t) => PRIORITY_RANK[t.priority], firstSortDirection: "desc", render: (t) => <TicketPriorityBadge priority={t.priority} /> },
  { key: "status", header: "Status", width: "12%", sortValue: (t) => STATUS_RANK[t.status], render: (t) => <TicketStatusBadge status={t.status} /> },
  { key: "updated", header: "Last update", width: "14%", sortValue: (t) => new Date(t.lastMessageAt), firstSortDirection: "desc", render: (t) => <span className="text-sm text-text-secondary whitespace-nowrap">{formatWhen(t.lastMessageAt)}</span> },
  {
    key: "chevron",
    header: "",
    width: "60px",
    align: "right",
    render: () => <ChevronRight size={16} className="inline text-text-disabled group-hover:text-primary" aria-hidden />,
  },
];

type TicketFilter = "active" | "done" | "all";

const FILTER_MATCH: Record<TicketFilter, (t: SupportTicket) => boolean> = {
  active: (t) => t.status === "open" || t.status === "in_progress",
  done: (t) => t.status === "resolved" || t.status === "closed",
  all: () => true,
};

function TicketTable({ tickets, filter, query }: { tickets: SupportTicket[]; filter: TicketFilter; query: string }) {
  const router = useRouter();
  const q = query.trim().toLowerCase();
  const shown = tickets.filter(
    (t) => FILTER_MATCH[filter](t) && (!q || t.subject.toLowerCase().includes(q) || t.ticketNo.toLowerCase().includes(q)),
  );
  const unread = tickets.filter((t) => t.unreadForRequester).length;
  return (
    <DataTable
      fill
      columns={TICKET_COLUMNS}
      data={shown}
      getRowId={(t) => t._id}
      onRowClick={(t) => router.push(`/support/${t._id}`)}
      defaultSort={{ key: "updated", direction: "desc" }}
      footer={
        <p className="text-footnote text-text-secondary tabular-nums">
          {shown.length} of {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
          {unread > 0 && ` · ${unread} with new replies`}
        </p>
      }
      emptyState={
        <div className="py-6 space-y-2">
          <Inbox className="mx-auto text-text-disabled" size={28} aria-hidden />
          {tickets.length === 0 ? (
            <>
              <p className="text-sm font-medium text-text-primary">You haven&apos;t raised any tickets</p>
              <p className="text-sm text-text-secondary">If something isn&apos;t working or you have a question, we&apos;re here to help.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-text-primary">
                {q ? `No tickets match “${query.trim()}”` : filter === "active" ? "No open tickets" : "No resolved tickets yet"}
              </p>
              <p className="text-sm text-text-secondary">{q ? "Try a ticket number or a word from the subject." : "Switch to All to see every ticket."}</p>
            </>
          )}
        </div>
      }
    />
  );
}

/* ─── Page ─── */

export default function SupportPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("help");
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    // ?tab=tickets (e.g. "Back to my tickets") is read here rather than via
    // useSearchParams, which would force a Suspense boundary on the page.
    const wantTickets = new URLSearchParams(window.location.search).get("tab") === "tickets";
    Promise.all([supportApi.faqs(), supportApi.myTickets()])
      .then(([f, t]) => {
        setFaqs(f);
        setTickets(t);
        if (wantTickets) setView("tickets");
      })
      .catch(() => setError(true));
  }, []);

  // Keep the ticket list (badges, statuses) current while the page is open.
  useSupportLive(() => {
    supportApi.myTickets().then(setTickets).catch(() => {});
  });

  const unread = tickets?.filter((t) => t.unreadForRequester).length ?? 0;

  const count = (f: TicketFilter) => tickets?.filter(FILTER_MATCH[f]).length ?? 0;
  const withCount = (label: string, n: number) => (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="tabular-nums text-text-secondary">{n}</span>
    </span>
  );

  return (
    // The ticket table stretches to the bottom; the help center scrolls normally.
    <Page fill={view === "tickets"}>
      <PageHeader
        title="Help & Support"
        toolbar={
          <>
            <Segmented<View>
              label="Help sections"
              value={view}
              onChange={setView}
              options={[
                { value: "help", label: "Help center" },
                {
                  value: "tickets",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      My tickets
                      {unread > 0 && (
                        <span
                          className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-semibold"
                          aria-label={`${unread} with new replies`}
                        >
                          {unread}
                        </span>
                      )}
                    </span>
                  ),
                },
              ]}
            />
            {view === "tickets" && tickets && tickets.length > 0 && (
              <>
                <span className="hidden sm:block h-6 w-px bg-border" aria-hidden />
                <div className="relative w-full sm:w-64 sm:order-first">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" aria-hidden />
                  <input
                    type="search"
                    aria-label="Search tickets"
                    placeholder="Search tickets…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <Segmented<TicketFilter>
                  label="Filter tickets"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "active", label: withCount("Open", count("active")) },
                    { value: "done", label: withCount("Resolved", count("done")) },
                    { value: "all", label: withCount("All", tickets.length) },
                  ]}
                />
              </>
            )}
          </>
        }
        actions={
          view === "tickets" && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus aria-hidden /> Raise a ticket
            </Button>
          )
        }
      />

      {error ? (
        <div className="rounded-2xl border border-border bg-bg-card p-6 text-center space-y-3">
          <p className="text-sm text-text-secondary">Couldn&apos;t load help content.</p>
          <button type="button" onClick={() => window.location.reload()} className="h-11 px-4 rounded-xl border border-border text-sm hover:bg-bg-hover cursor-pointer">
            Try again
          </button>
        </div>
      ) : !faqs || !tickets ? (
        <LoadingState size="lg" />
      ) : view === "tickets" ? (
        <div role="tabpanel" aria-label="My tickets" className="flex-1 min-h-0 flex flex-col">
          <TicketTable tickets={tickets} filter={filter} query={query} />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
          <div role="tabpanel" aria-label="Help center" className="min-w-0">
            <HelpCenter faqs={faqs} onAsk={() => setNewOpen(true)} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-4" aria-label="Contact support">
            <ContactCard onNew={() => setNewOpen(true)} />
            <RecentTickets tickets={tickets} onViewAll={() => setView("tickets")} />
          </aside>
        </div>
      )}

      <NewTicketDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(t) => router.push(`/support/${t._id}`)}
      />
    </Page>
  );
}
