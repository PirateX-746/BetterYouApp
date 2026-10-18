"use client";

import Link from "next/link";
import {
  Activity,
  Building2,
  CalendarCheck,
  PauseCircle,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { CardLink, EmptyBlock, SectionCard, StatCard } from "@/components/common/Dashboard";
import {
  StatusPill,
  LoadingState,
  ErrorState,
  toneForPracticeStatus,
} from "@/components/containers/superadmin/console-ui";
import {
  fetchMetrics,
  fetchPractices,
  fetchAuditLogs,
  formatDate,
  formatDateTime,
  useAsync,
} from "@/lib/superadmin/api";

/** Tallest bar in the signups chart, in pixels. */
const BAR_MAX_PX = 100;

/**
 * Platform overview. Same structure and type scale as the practitioner
 * dashboard (components/common/Dashboard): headline metrics, a totals strip,
 * then sections in one card style. Counts and metadata only — the console
 * never shows clinical records.
 */
export default function PlatformDashboardPage() {
  const metrics = useAsync(fetchMetrics, []);
  const practices = useAsync(fetchPractices, []);
  const audit = useAsync(() => fetchAuditLogs(6), []);

  const m = metrics.data;
  const recentPractices = (practices.data ?? []).slice(0, 5);
  const signups = m?.signupsByMonth ?? [];
  const peak = Math.max(...signups.map((s) => s.count), 1);
  const thisMonth = signups[signups.length - 1]?.count ?? 0;

  return (
    <Page>
      <PageHeader title="Platform overview" subtitle="Across every practice on BetterYou" />

      {metrics.loading && (
        <div className="bg-bg-card border border-border rounded-2xl">
          <LoadingState label="Loading platform metrics…" />
        </div>
      )}
      {metrics.error && (
        <div className="bg-bg-card border border-border rounded-2xl">
          <ErrorState message={metrics.error} onRetry={metrics.reload} />
        </div>
      )}

      {m && (
        <>
          {/* ── Headline metrics ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Total practices"
              value={m.practicesTotal}
              icon={Building2}
              tone="neutral"
              sub={`${m.practicesActive} active · ${m.practicesTrial} trial`}
              href="/admin/practices"
            />
            <StatCard label="Active" value={m.practicesActive} icon={Activity} tone="success" sub="Billing and running" />
            <StatCard label="Trial" value={m.practicesTrial} icon={ShieldCheck} tone="purple" sub="Converting or expiring" />
            <StatCard
              label="Suspended"
              value={m.practicesSuspended}
              icon={PauseCircle}
              tone="warning"
              sub="Access blocked, data retained"
            />
          </div>

          {/* ── Totals strip ── */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 bg-bg-card border border-border rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { label: "Practitioners", value: m.practitionersTotal.toLocaleString("en-IN"), icon: Stethoscope },
              { label: "Patients (counts only)", value: m.patientsTotal.toLocaleString("en-IN"), icon: Users },
              { label: "Appointments, all time", value: m.appointmentsTotal.toLocaleString("en-IN"), icon: CalendarCheck },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3.5">
                <Icon size={16} className="text-text-secondary shrink-0" aria-hidden />
                <dt className="text-sm text-text-secondary flex-1 min-w-0 truncate">{label}</dt>
                <dd className="text-base font-semibold text-text-primary tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {/* ── New practices + recent registrations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="New practices" subtitle={`Last six months · ${thisMonth} this month`}>
          {metrics.loading ? (
            <LoadingState />
          ) : signups.length === 0 ? (
            <EmptyBlock icon={Building2} title="No signups yet" />
          ) : (
            <div className="p-5">
              {/* Each bar carries its count as text, so height isn't the only cue. */}
              <ol className="flex items-end justify-between gap-2 h-40" aria-label="New practices per month">
                {signups.map((s, i) => {
                  const current = i === signups.length - 1;
                  return (
                    <li key={s.month} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                      <span className="text-xs font-medium text-text-primary tabular-nums">{s.count}</span>
                      <div
                        className={`w-full max-w-10 rounded-md ${current ? "bg-primary" : s.count === 0 ? "bg-border" : "bg-primary/35"}`}
                        style={{ height: `${Math.max(4, (s.count / peak) * BAR_MAX_PX)}px` }}
                        aria-hidden
                      />
                      <span className={`text-xs ${current ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                        {s.month}
                        <span className="sr-only">: {s.count} new practices</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Recent registrations"
          subtitle="Newest practices first"
          action={<CardLink href="/admin/practices">All practices</CardLink>}
        >
          {practices.loading ? (
            <LoadingState />
          ) : practices.error ? (
            <ErrorState message={practices.error} onRetry={practices.reload} />
          ) : recentPractices.length === 0 ? (
            <EmptyBlock icon={Building2} title="No practices yet" hint="Onboard the first practice from the Practices screen." />
          ) : (
            <ul className="divide-y divide-border">
              {recentPractices.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/practices/${p.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0" aria-hidden>
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                      <p className="text-xs text-text-secondary truncate">
                        {p.subdomain} · {formatDate(p.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-sm font-medium text-text-primary tabular-nums">
                        {p.practitioners} practitioner{p.practitioners === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-text-secondary tabular-nums">{p.patients.toLocaleString("en-IN")} patients</p>
                    </div>
                    <StatusPill label={p.status} tone={toneForPracticeStatus(p.status)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ── Activity ── */}
      <SectionCard
        title="Recent activity"
        subtitle="Platform actions — names of what changed, never its contents"
        action={<CardLink href="/admin/audit-logs">Full audit log</CardLink>}
      >
        {audit.loading ? (
          <LoadingState />
        ) : audit.error ? (
          <ErrorState message={audit.error} onRetry={audit.reload} />
        ) : (audit.data ?? []).length === 0 ? (
          <EmptyBlock
            icon={Activity}
            title="No recorded activity"
            hint="Platform actions such as onboarding or suspending a practice appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {(audit.data ?? []).map((a) => (
              <li key={a._id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-mono">{a.action}</span>
                    <span className="text-text-secondary"> on {a.entityType} </span>
                    <span className="font-mono text-xs text-text-secondary">{a.entityId}</span>
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{a.actorRole.replace("_", " ")}</p>
                </div>
                <time dateTime={a.createdAt} className="text-xs text-text-secondary whitespace-nowrap shrink-0">
                  {formatDateTime(a.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </Page>
  );
}
