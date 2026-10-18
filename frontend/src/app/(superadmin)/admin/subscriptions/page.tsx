"use client";

import { CreditCard, IndianRupee, Sparkles } from "lucide-react";
import {
  PageHeader,
  Panel,
  StatTile,
  StatusPill,
  TableShell,
  LoadingState,
  ErrorState,
  EmptyState,
  toneForSubscription,
} from "@/components/containers/superadmin/console-ui";
import {
  fetchSubscriptionOverview,
  formatDate,
  formatINR,
  useAsync,
} from "@/lib/superadmin/api";

/**
 * Reads the real subscription records. The plan catalogue is seeded by the
 * backend rather than hardcoded here, so prices and limits shown to an
 * operator are the same ones billing actually charges against.
 *
 * MRR counts only subscriptions in ACTIVE status — a trial contributes
 * nothing until it converts, and counting it would overstate revenue.
 */
export default function SubscriptionsPage() {
  const { data, loading, error, reload } = useAsync(
    fetchSubscriptionOverview,
    [],
  );

  const plans = data?.plans ?? [];
  const subscriptions = data?.subscriptions ?? [];

  const billing = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const trialing = subscriptions.filter((s) => s.status === "TRIALING").length;

  if (loading) {
    return (
      <>
        <PageHeader
          title="Subscriptions"
          subtitle="Plan catalogue and practice billing status"
        />
        <div className="bg-bg-card border border-border rounded-2xl">
          <LoadingState label="Loading subscriptions…" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Subscriptions"
          subtitle="Plan catalogue and practice billing status"
        />
        <div className="bg-bg-card border border-border rounded-2xl">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Plan catalogue and practice billing status"
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-4">
        <StatTile
          label="Monthly recurring revenue"
          value={formatINR(data?.mrr ?? 0)}
          hint="Actively billing subscriptions only"
          icon={IndianRupee}
        />
        <StatTile
          label="Billing"
          value={billing}
          hint="Practices on a paid plan"
          icon={CreditCard}
        />
        <StatTile
          label="Trialing"
          value={trialing}
          hint="Not yet contributing revenue"
          icon={Sparkles}
        />
      </div>

      <div className="mb-4">
        <Panel title="Plans and limits">
          {plans.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No plans seeded"
              hint="The backend seeds the catalogue on startup — restart the API if this stays empty."
            />
          ) : (
            <TableShell
              headers={["Plan", "Monthly", "Practitioners", "Patients"]}
            >
              {plans.map((p) => (
                <tr key={p.key} className="hover:bg-bg-hover transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-text-primary">
                      {p.name}
                    </p>
                    <p className="text-xs font-mono text-text-secondary">
                      {p.key}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-primary tabular-nums">
                    {p.monthlyPrice ? formatINR(p.monthlyPrice) : "Free"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary tabular-nums">
                    {p.maxPractitioners ?? "Unlimited"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary tabular-nums">
                    {p.maxPatients?.toLocaleString("en-IN") ?? "Unlimited"}
                  </td>
                </tr>
              ))}
            </TableShell>
          )}
        </Panel>
      </div>

      <Panel title={`Practice subscriptions · ${subscriptions.length}`}>
        {subscriptions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No subscriptions yet"
            hint="Onboarding a practice starts it on a trial, which appears here."
          />
        ) : (
          <TableShell
            headers={["Practice", "Plan", "Status", "Monthly", "Renews", "Started"]}
          >
            {subscriptions.map((s) => (
              <tr key={s.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-text-primary">
                  {s.practiceName ?? (
                    <span className="text-text-disabled">Archived practice</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-text-secondary">
                    {s.plan}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill
                    label={s.status.replace("_", " ")}
                    tone={toneForSubscription(s.status)}
                  />
                </td>
                <td className="px-5 py-3.5 text-sm text-text-primary tabular-nums">
                  {s.monthlyPrice ? formatINR(s.monthlyPrice) : "—"}
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                  {s.status === "TRIALING"
                    ? s.trialEndsAt
                      ? `Trial ends ${formatDate(s.trialEndsAt)}`
                      : "—"
                    : formatDate(s.renewsAt)}
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                  {formatDate(s.startedAt)}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <p className="text-xs text-text-disabled mt-4 max-w-2xl">
        No payment provider is wired up — these records track plan and price
        only, and nothing is charged. Each carries{" "}
        <span className="font-mono">externalCustomerId</span> and{" "}
        <span className="font-mono">externalSubscriptionId</span> so Stripe,
        Razorpay or another provider can be attached without reshaping them.
      </p>
    </>
  );
}
