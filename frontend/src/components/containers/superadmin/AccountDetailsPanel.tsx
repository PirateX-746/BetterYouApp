"use client";

import { Panel, StatusPill } from "@/components/containers/superadmin/console-ui";
import {
  fetchAdminProfile,
  formatDate,
  formatDateTime,
  nameInitials,
  useAdminName,
  useAsync,
} from "@/lib/superadmin/api";

/** The signed-in platform admin's own account, read-only (Settings). */
export function AccountDetailsPanel() {
  const { data: profile, loading, error } = useAsync(fetchAdminProfile);
  // Follows renames from the profile form without refetching.
  const name = useAdminName() || profile?.name || "Platform Admin";

  const rows: { label: string; value: React.ReactNode }[] = profile
    ? [
        { label: "Email", value: profile.email },
        { label: "Role", value: "Super Admin" },
        {
          label: "Status",
          value: (
            <StatusPill
              label={profile.isActive ? "Active" : "Disabled"}
              tone={profile.isActive ? "success" : "neutral"}
            />
          ),
        },
        { label: "Last sign-in", value: formatDateTime(profile.lastLoginAt) },
        { label: "Account created", value: formatDate(profile.createdAt) },
      ]
    : [];

  return (
    <Panel title="Account details" subtitle="The account you're signed in with" padded>
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
        <div className="w-11 h-11 rounded-full bg-purple flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {nameInitials(name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
          <p className="text-xs text-text-secondary truncate">
            {profile?.email ?? (loading ? "Loading…" : "")}
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger-strong">Couldn&apos;t load your account details.</p>
      ) : loading ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : (
        <dl className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-text-secondary">{r.label}</dt>
              <dd className="text-sm text-text-primary text-right min-w-0 truncate">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
