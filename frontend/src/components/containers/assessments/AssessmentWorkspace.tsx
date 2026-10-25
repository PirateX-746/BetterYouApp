"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Loader2, Plus, Search, X } from "lucide-react";
import { inputClass } from "@/components/common/Field";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { Badge } from "@/components/common/Badge";
import { Segmented } from "@/components/common/Tabs";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api";
import { mySessions, STATUS_META, tabsStore, type SessionRow } from "@/lib/assessments";
import { AssessmentEditor, type TabMeta } from "./AssessmentEditor";

const MAX_TABS = 8;

/* Tab status dots mirror the Badge tones in STATUS_META (and carry an sr-only label). */
const STATUS_DOT: Record<string, string> = {
  none: "bg-text-light",
  draft: "bg-text-light",
  ready_for_review: "bg-warning",
  submitted: "bg-success",
  amended: "bg-primary",
};
const NEW = "__new__";

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true, minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  if (yesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + `, ${time}`;
};

/**
 * Assessment workspace: one browser-like tab per appointment, so a
 * practitioner can keep several sessions' notes open and switch between
 * them. Tabs persist per user on this device; `?appointment=<id>` opens (or
 * focuses) a tab — that's how the calendar and patient profile link here.
 */
export function AssessmentWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string>(NEW);
  const [meta, setMeta] = useState<Record<string, TabMeta>>({});
  const [ready, setReady] = useState(false);

  // Restore tabs, then apply ?appointment=
  useEffect(() => {
    const saved = tabsStore.read();
    let next = saved.tabs.slice(0, MAX_TABS);
    let act = saved.active && next.includes(saved.active) ? saved.active : next[0] ?? NEW;
    const want = params.get("appointment");
    if (want && /^[a-f0-9]{24}$/i.test(want)) {
      if (!next.includes(want)) next = [...next, want].slice(-MAX_TABS);
      act = want;
      router.replace(pathname, { scroll: false });
    }
    setTabs(next);
    setActive(act);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (ready) tabsStore.write(tabs, active === NEW ? null : active);
  }, [tabs, active, ready]);

  const onMeta = useCallback((id: string, m: TabMeta) => {
    setMeta((prev) => {
      const p = prev[id];
      if (p && p.title === m.title && p.status === m.status && p.unsaved === m.unsaved) return prev;
      return { ...prev, [id]: m };
    });
  }, []);

  const open = (appointmentId: string) => {
    setTabs((t) => (t.includes(appointmentId) ? t : [...t, appointmentId].slice(-MAX_TABS)));
    setActive(appointmentId);
  };

  const close = (id: string) => {
    const m = meta[id];
    if (m?.unsaved && !window.confirm("This tab has changes that haven't been saved yet. Close it anyway? They stay backed up on this device.")) return;
    setTabs((t) => {
      const i = t.indexOf(id);
      const next = t.filter((x) => x !== id);
      if (active === id) setActive(next[Math.min(i, next.length - 1)] ?? NEW);
      return next;
    });
  };

  // No sessions open: the session list IS the page — no lone tab strip over an
  // empty workspace. Opening a session switches to the tabbed workspace.
  if (ready && tabs.length === 0) {
    return (
      <Page fill>
        <PageHeader title="Session assessments" />
        <Launcher openIds={tabs} onOpen={open} />
      </Page>
    );
  }

  return (
    <Page fill>
      <PageHeader title="Session assessments" />

      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border/70 bg-bg-card shadow-xs overflow-clip">
        {/* Tab strip — one tab per open session, like documents in a window */}
        <div role="tablist" aria-label="Open assessments" className="flex items-end gap-1 px-2 pt-2 bg-bg-subtle border-b border-border overflow-x-auto overflow-y-hidden scrollbar-hide">
          {tabs.map((id) => {
            const m = meta[id];
            const on = active === id;
            return (
              <div
                key={id}
                className={`group relative flex items-center shrink-0 max-w-[16rem] rounded-t-lg border border-b-0 transition-colors ${
                  on ? "bg-bg-card border-border -mb-px" : "border-transparent hover:bg-bg-hover"
                }`}
              >
                <button
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={on}
                  aria-controls={`panel-${id}`}
                  onClick={() => setActive(id)}
                  className="h-10 flex items-center gap-2 pl-3 pr-1 min-w-0 text-body cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 rounded-t-lg"
                >
                  {m?.status !== undefined && (
                    <span
                      className={`size-2 rounded-full shrink-0 ${STATUS_DOT[m.status ?? "none"]}`}
                      title={m.status ? STATUS_META[m.status].label : "Not started"}
                      aria-hidden
                    />
                  )}
                  <span className={`truncate ${on ? "font-semibold text-text-primary" : "font-medium text-text-secondary"}`}>{m?.title ?? "Loading…"}</span>
                  {m?.status && <span className="sr-only">, {STATUS_META[m.status].label}</span>}
                  {m?.unsaved && (
                    <span className="text-caption text-warning-strong shrink-0" aria-label="Unsaved changes">
                      ●
                    </span>
                  )}
                </button>
                <button
                  onClick={() => close(id)}
                  aria-label={`Close ${m?.title ?? "tab"}`}
                  className="size-7 mr-1 grid place-items-center rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            );
          })}
          <button
            role="tab"
            aria-selected={active === NEW}
            onClick={() => setActive(NEW)}
            aria-label="Open another session"
            title="Open another session"
            className={`h-10 shrink-0 flex items-center gap-1.5 px-3 rounded-t-lg border border-b-0 text-body font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
              active === NEW ? "bg-bg-card border-border -mb-px text-primary-strong" : "border-transparent text-primary-strong hover:bg-primary/10"
            }`}
          >
            <Plus size={15} aria-hidden /> Open session
          </button>
        </div>

        {/* Panels — editors stay mounted so switching never loses state */}
        <div className="flex-1 min-h-0 relative overflow-clip">
          {tabs.map((id) => (
            <div key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={active !== id} className="absolute inset-0">
              <AssessmentEditor appointmentId={id} onMeta={onMeta} />
            </div>
          ))}
          {active === NEW && (
            <div className="absolute inset-0 flex flex-col bg-bg-page p-4 md:p-6">
              <Launcher openIds={tabs} onOpen={open} />
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

type Filter = "todo" | "not_started" | "draft" | "ready_for_review" | "all";

const isTodo = (r: SessionRow) => !r.assessmentStatus || r.assessmentStatus === "draft" || r.assessmentStatus === "ready_for_review";

/* Workflow order, so sorting by status reads "not started → … → submitted". */
const STATUS_RANK: Record<string, number> = { none: 0, draft: 1, ready_for_review: 2, amended: 3, submitted: 4 };

const patientName = (r: SessionRow) => (r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "Patient");

/**
 * The session list: sessions from the last 14 days that have started, with
 * their assessment status. Counts double as filters; newest first, so "what's
 * left from today" is the first thing you see. Every column but the action sorts.
 */
function Launcher({ openIds, onOpen }: { openIds: string[]; onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("todo");
  const [query, setQuery] = useState("");

  useEffect(() => {
    mySessions()
      .then(setRows)
      .catch((e) => setError(apiErrorMessage(e, "Couldn't load your sessions.")));
  }, []);

  const q = query.trim().toLowerCase();
  // Counts follow the search, so each number is what that filter would show.
  const all = (rows ?? []).filter((r) => !q || patientName(r).toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
  const counts = {
    not_started: all.filter((r) => !r.assessmentStatus).length,
    draft: all.filter((r) => r.assessmentStatus === "draft").length,
    ready_for_review: all.filter((r) => r.assessmentStatus === "ready_for_review").length,
  };
  const todoCount = all.filter(isTodo).length;

  const visible = all.filter((r) =>
    filter === "all" ? true
    : filter === "todo" ? isTodo(r)
    : filter === "not_started" ? !r.assessmentStatus
    : r.assessmentStatus === filter,
  );

  const columns: DataTableColumn<SessionRow>[] = [
    {
      key: "patient",
      header: "Patient",
      width: "30%",
      sortValue: patientName,
      render: (r) => {
        const name = patientName(r);
        return (
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-9 rounded-full bg-primary/10 text-primary-strong grid place-items-center text-caption font-semibold shrink-0" aria-hidden>
              {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <span className="text-body font-medium text-text-primary truncate group-hover:text-primary-strong">{name}</span>
          </div>
        );
      },
    },
    {
      key: "session",
      header: "Session",
      width: "24%",
      className: "text-body text-text-secondary",
      sortValue: (r) => r.title,
      render: (r) => <span className="block truncate">{r.title}</span>,
    },
    {
      key: "date",
      header: "Date",
      width: "18%",
      className: "text-body text-text-secondary tabular-nums whitespace-nowrap",
      sortValue: (r) => new Date(r.start),
      firstSortDirection: "desc",
      render: (r) => fmtWhen(r.start),
    },
    {
      key: "status",
      header: "Status",
      width: "16%",
      sortValue: (r) => STATUS_RANK[r.assessmentStatus ?? "none"],
      render: (r) => {
        const st = r.assessmentStatus ? STATUS_META[r.assessmentStatus] : null;
        return st ? <Badge tone={st.tone} dot>{st.label}</Badge> : <Badge tone="neutral" dot>Not started</Badge>;
      },
    },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      width: "8.5rem",
      align: "right",
      render: (r) => {
        const isOpen = openIds.includes(r.appointmentId);
        const cta = !r.assessmentStatus ? "Start" : isTodo(r) ? "Resume" : "View";
        return (
          <Button
            size="sm"
            variant={cta === "View" && !isOpen ? "secondary" : "tertiary"}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(r.appointmentId);
            }}
            aria-label={`${isOpen ? "Go to tab for" : cta} ${patientName(r)}, ${r.title}`}
          >
            {isOpen ? "Go to tab" : cta}
          </Button>
        );
      },
    },
  ];

  const count = (label: string, n: number | null) => (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {n !== null && <span className="tabular-nums text-text-secondary">{n}</span>}
    </span>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Search left, then one filter control whose counts are the filters. */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" aria-hidden />
          <input
            type="search"
            aria-label="Search sessions"
            placeholder="Search patient or session…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass} pl-9 pr-9`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded text-text-light hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={13} aria-hidden />
            </button>
          )}
        </div>
        <div className="max-w-full overflow-x-auto scrollbar-hide">
        <Segmented<Filter>
          label="Filter sessions"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todo", label: count("To do", rows ? todoCount : null) },
            { value: "not_started", label: count("Not started", rows ? counts.not_started : null) },
            { value: "draft", label: count("Drafts", rows ? counts.draft : null) },
            { value: "ready_for_review", label: count("Ready for review", rows ? counts.ready_for_review : null) },
            { value: "all", label: count("All", rows ? all.length : null) },
          ]}
        />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-body text-danger-strong">{error}</p>
      ) : !rows ? (
        <div className="py-16 grid place-items-center text-text-secondary">
          <Loader2 className="animate-spin" size={20} aria-label="Loading sessions" />
        </div>
      ) : (
        <DataTable
          fill
          columns={columns}
          data={visible}
          getRowId={(r) => r.appointmentId}
          onRowClick={(r) => onOpen(r.appointmentId)}
          defaultSort={{ key: "date", direction: "desc" }}
          className="min-w-0 [&_table]:min-w-[44rem]"
          footer={
            <p className="text-footnote text-text-secondary tabular-nums">
              {visible.length} session{visible.length === 1 ? "" : "s"} · from the last 14 days that have started
            </p>
          }
          emptyState={
            <div className="py-4">
              <span className="mx-auto size-12 rounded-2xl bg-success-light text-success-strong grid place-items-center">
                <ClipboardList size={22} aria-hidden />
              </span>
              <p className="mt-4 text-body font-semibold text-text-primary">
                {q ? `No sessions match “${query.trim()}”` : filter === "all" ? "No recent sessions" : "You're all caught up"}
              </p>
              <p className="text-footnote text-text-secondary mt-1">
                {q
                  ? "Try a patient's name or a session type."
                  : filter === "all"
                    ? "Sessions appear here once their start time has passed."
                    : "Every recent session in this view has a submitted assessment."}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}
