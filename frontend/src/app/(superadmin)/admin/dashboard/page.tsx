"use client";

import Link from "next/link";
import {
  Building2,
  Stethoscope,
  Users,
  CalendarCheck,
  ChevronRight,
  Activity,
  ShieldCheck,
} from "lucide-react";
import {
  PageHeader,
  StatTile,
  Panel,
  StatusPill,
  LoadingState,
  ErrorState,
  EmptyState,
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
const BAR_MAX_PX = 84;

export default function PlatformDashboardPage() {
  const metrics = useAsync(fetchMetrics, []);
  const practices = useAsync(fetchPractices, []);
  const audit = useAsync(() => fetchAuditLogs(6), []);

  const m = metrics.data;
  const recentPractices = (practices.data ?? []).slice(0, 5);
  const signups = m?.signupsByMonth ?? [];
  const peak = Math.max(...signups.map((s) => s.count), 1);

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle="Across every practice on BetterYou"
      />

      {metrics.loading && (
        <div className="bg-bg-card border border-border rounded-2xl mb-6">
          <LoadingState label="Loading platform metrics…" />
        </div>
      )}

      {metrics.error && (
        <div className="bg-bg-card border border-border rounded-2xl mb-6">
          <ErrorState message={metrics.error} onRetry={metrics.reload} />
        </div>
      )}

      {m && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-4">
            <StatTile
              label="Total practices"
              value={m.practicesTotal}
              hint={`${m.practicesActive} active · ${m.practicesTrial} trial`}
              icon={Building2}
            />
            <StatTile
              label="Active"
              value={m.practicesActive}
              hint="Billing and running"
              icon={Activity}
              tone="success"
            />
            <StatTile
              label="Trial"
              value={m.practicesTrial}
              hint="Converting or expiring"
              icon={ShieldCheck}
              tone="purple"
            />
            <StatTile
              label="Suspended"
              value={m.practicesSuspended}
              hint="Access blocked, data retained"
              icon={Building2}
              tone="warning"
            />
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6">
            <StatTile
              label="Practitioners"
              value={m.practitionersTotal}
              hint="All practices"
              icon={Stethoscope}
            />
            <StatTile
              label="Patients"
              value={m.patientsTotal.toLocaleString("en-IN")}
              hint="Counts only — no records here"
              icon={Users}
            />
            <StatTile
              label="Appointments"
              value={m.appointmentsTotal.toLocaleString("en-IN")}
              hint="All time"
              icon={CalendarCheck}
            />
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Panel title="New practices" padded>
          <p className="text-xs text-text-secondary -mt-1 mb-4">
            Last six months
          </p>

          {metrics.loading ? (
            <LoadingState />
          ) : signups.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center">
              No data yet
            </p>
          ) : (
            <>
              {/* Bar heights are computed in pixels: a percentage height
                  would not resolve against an auto-height flex column. */}
              <div className="flex items-end gap-2">
                {signups.map((s) => (
                  <div
                    key={s.month}
                    className="flex-1 flex flex-col items-center gap-1.5"
                  >
                    <span className="text-xs font-semibold text-text-primary tabular-nums">
                      {s.count}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-purple"
                      style={{
                        height: `${Math.max(3, (s.count / peak) * BAR_MAX_PX)}px`,
                      }}
                      aria-hidden
                    />
                    <span className="text-[11px] text-text-disabled">
                      {s.month}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-text-secondary">
                  Signed up this month
                </p>
                <p className="text-sm font-bold text-text-primary tabular-nums">
                  {signups[signups.length - 1]?.count ?? 0}
                </p>
              </div>
            </>
          )}
        </Panel>

        <div className="lg:col-span-2">
          <Panel
            title="Recent registrations"
            action={
              <Link
                href="/admin/practices"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                All practices <ChevronRight size={13} />
              </Link>
            }
          >
            {practices.loading ? (
              <LoadingState />
            ) : practices.error ? (
              <ErrorState message={practices.error} onRetry={practices.reload} />
            ) : recentPractices.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No practices yet"
                hint="Onboard the first practice from the Practices screen."
              />
            ) : (
              <div className="divide-y divide-border">
                {recentPractices.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/practices/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-hover transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-light text-purple flex items-center justify-center text-xs font-semibold shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                        {p.name}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {p.subdomain} · {formatDate(p.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-xs text-text-secondary tabular-nums">
                        {p.practitioners} practitioners
                      </p>
                      <p className="text-xs text-text-disabled tabular-nums">
                        {p.patients.toLocaleString("en-IN")} patients
                      </p>
                    </div>
                    <StatusPill
                      label={p.status}
                      tone={toneForPracticeStatus(p.status)}
                    />
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Recent activity"
        action={
          <Link
            href="/admin/audit-logs"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            Full audit log <ChevronRight size={13} />
          </Link>
        }
      >
        {audit.loading ? (
          <LoadingState />
        ) : audit.error ? (
          <ErrorState message={audit.error} onRetry={audit.reload} />
        ) : (audit.data ?? []).length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recorded activity"
            hint="Platform actions such as onboarding or suspending a practice appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {(audit.data ?? []).map((a) => (
              <div key={a._id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-mono text-xs text-purple">
                        {a.action}
                      </span>
                      <span className="text-text-secondary">
                        {" "}
                        on {a.entityType}{" "}
                      </span>
                      <span className="font-mono text-xs text-text-secondary">
                        {a.entityId}
                      </span>
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {a.actorRole}
                    </p>
                  </div>
                  <span className="text-xs text-text-disabled whitespace-nowrap shrink-0">
                    {formatDateTime(a.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
