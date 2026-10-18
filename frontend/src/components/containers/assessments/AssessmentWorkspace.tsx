"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Loader2, Plus, X } from "lucide-react";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { Badge } from "@/components/common/Badge";
import { apiErrorMessage } from "@/lib/api";
import { mySessions, STATUS_META, tabsStore, type SessionRow } from "@/lib/assessments";
import { AssessmentEditor, type TabMeta } from "./AssessmentEditor";

const MAX_TABS = 8;
const NEW = "__new__";

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
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

  return (
    <Page fill>
      <PageHeader title="Session assessments" subtitle="Record observations for sessions you've held. Drafts save automatically." />

      <div className="flex-1 min-h-0 flex flex-col rounded-md border border-border bg-bg-card overflow-clip">
        {/* Tab strip */}
        <div role="tablist" aria-label="Open assessments" className="flex items-end gap-1 px-2 pt-2 bg-bg-page border-b border-border overflow-x-auto">
          {tabs.map((id) => {
            const m = meta[id];
            const on = active === id;
            return (
              <div
                key={id}
                className={`group relative flex items-center shrink-0 max-w-[15rem] rounded-t-md border border-b-0 transition-colors ${
                  on ? "bg-bg-card border-border -mb-px" : "border-transparent hover:bg-bg-hover"
                }`}
              >
                <button
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={on}
                  aria-controls={`panel-${id}`}
                  onClick={() => setActive(id)}
                  className="h-10 flex items-center gap-2 pl-3 pr-1 min-w-0 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 rounded-t-md"
                >
                  <span className={`truncate ${on ? "font-medium text-text-primary" : "text-text-secondary"}`}>{m?.title ?? "Loading…"}</span>
                  {m?.unsaved && <span className="size-1.5 rounded-full bg-warning shrink-0" aria-label="Unsaved changes" />}
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
            className={`h-10 shrink-0 flex items-center gap-1.5 px-3 rounded-t-md border border-b-0 text-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
              active === NEW ? "bg-bg-card border-border -mb-px text-text-primary font-medium" : "border-transparent text-text-secondary hover:bg-bg-hover"
            }`}
          >
            <Plus size={15} aria-hidden /> {tabs.length ? "Open session" : "Sessions"}
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
            <div className="absolute inset-0 overflow-y-auto">
              <Launcher openIds={tabs} onOpen={open} />
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

function Launcher({ openIds, onOpen }: { openIds: string[]; onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"todo" | "all">("todo");

  useEffect(() => {
    mySessions()
      .then(setRows)
      .catch((e) => setError(apiErrorMessage(e, "Couldn't load your sessions.")));
  }, []);

  const visible = (rows ?? []).filter((r) => filter === "all" || r.assessmentStatus === null || r.assessmentStatus === "draft" || r.assessmentStatus === "ready_for_review");
  const todoCount = (rows ?? []).filter((r) => !r.assessmentStatus || r.assessmentStatus === "draft" || r.assessmentStatus === "ready_for_review").length;

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Recent sessions</h2>
          <p className="text-sm text-text-secondary mt-0.5">Sessions from the last 14 days that have started. Pick one to open it in a tab.</p>
        </div>
        <div role="radiogroup" aria-label="Show" className="inline-flex p-[3px] rounded-md border border-border bg-bg-page">
          {([["todo", `To do${rows ? ` (${todoCount})` : ""}`], ["all", "All"]] as const).map(([v, label]) => (
            <button
              key={v}
              role="radio"
              aria-checked={filter === v}
              onClick={() => setFilter(v)}
              className={`h-8 px-3 rounded text-sm cursor-pointer transition-colors ${
                filter === v ? "bg-bg-card border border-border text-primary font-semibold shadow-sm" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : !rows ? (
        <div className="py-12 grid place-items-center text-text-secondary">
          <Loader2 className="animate-spin" size={20} aria-label="Loading sessions" />
        </div>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center">
          <ClipboardList className="mx-auto text-text-disabled" size={28} aria-hidden />
          <p className="mt-3 text-sm font-medium text-text-primary">{filter === "todo" ? "You're all caught up" : "No recent sessions"}</p>
          <p className="text-sm text-text-secondary mt-1">
            {filter === "todo" ? "Every recent session has a submitted assessment." : "Sessions appear here once their start time has passed."}
          </p>
        </div>
      ) : (
        <ul className="rounded-md border border-border divide-y divide-border overflow-hidden">
          {visible.map((r) => {
            const name = r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : "Patient";
            const st = r.assessmentStatus ? STATUS_META[r.assessmentStatus] : null;
            const isOpen = openIds.includes(r.appointmentId);
            const cta = !r.assessmentStatus ? "Start" : r.assessmentStatus === "draft" || r.assessmentStatus === "ready_for_review" ? "Resume" : "View";
            return (
              <li key={r.appointmentId}>
                <button
                  onClick={() => onOpen(r.appointmentId)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-bg-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-bg-hover"
                >
                  <span className="size-9 rounded-full bg-primary-light text-primary grid place-items-center text-xs font-semibold shrink-0" aria-hidden>
                    {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text-primary truncate">{name}</span>
                    <span className="block text-xs text-text-secondary truncate">
                      {r.title} · {fmtWhen(r.start)}
                    </span>
                  </span>
                  {st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge tone="neutral">Not started</Badge>}
                  <span className="hidden sm:inline-flex h-9 items-center px-3 rounded-md border border-border text-sm font-medium text-text-primary bg-bg-card">
                    {isOpen ? "Go to tab" : cta}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
