"use client";

import { useMemo, useState } from "react";
import { Search, ScrollText, ShieldCheck } from "lucide-react";
import {
  PageHeader,
  StatusPill,
  Panel,
  TableShell,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/containers/superadmin/console-ui";
import { fetchAuditLogs, formatDateTime, useAsync } from "@/lib/superadmin/api";

const ACTOR_ROLES = ["ALL", "super_admin", "practice_admin", "practitioner"] as const;
type ActorFilter = (typeof ACTOR_ROLES)[number];

function toneForActor(role: string) {
  if (role === "super_admin") return "purple" as const;
  if (role === "practice_admin") return "success" as const;
  return "neutral" as const;
}

export default function AuditLogsPage() {
  const { data, loading, error, reload } = useAsync(() => fetchAuditLogs(200), []);

  const [query, setQuery] = useState("");
  const [actorRole, setActorRole] = useState<ActorFilter>("ALL");

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => {
      const matchesRole = actorRole === "ALL" || a.actorRole === actorRole;
      const matchesQuery =
        !q ||
        a.action.toLowerCase().includes(q) ||
        a.entityType.toLowerCase().includes(q) ||
        a.entityId.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [rows, query, actorRole]);

  return (
    <>
      <PageHeader
        title="Audit logs"
        subtitle={
          loading ? "Loading…" : `${filtered.length} of ${rows.length} actions`
        }
      />

      <div className="mb-6 px-4 py-3 rounded-xl border border-border bg-bg-card flex items-start gap-3">
        <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">
            Entries name what changed, never its contents.
          </span>{" "}
          An action records the entity type and id — never note text,
          diagnoses or medication names. An audit trail that copies the record
          it audits would double the blast radius of any leak.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
          />
          <input
            id="audit-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, entity type or id…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-bg-card text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ACTOR_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setActorRole(r)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                actorRole === r
                  ? "bg-purple text-white"
                  : "bg-bg-card border border-border text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {r === "ALL" ? "All actors" : r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <Panel title="Activity">
        {loading ? (
          <LoadingState label="Loading audit log…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No recorded actions yet"
            hint="Onboarding, suspending or editing a practice writes an entry here."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No entries match"
            hint="Try a different search or filter."
          />
        ) : (
          <TableShell
            headers={["When", "Action", "Entity", "Actor", "IP"]}
          >
            {filtered.map((a) => (
              <tr key={a._id} className="hover:bg-bg-hover transition-colors">
                <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap tabular-nums">
                  {formatDateTime(a.createdAt)}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-purple">
                    {a.action}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm text-text-primary">{a.entityType}</p>
                  <p className="text-xs font-mono text-text-secondary">
                    {a.entityId}
                  </p>
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill
                    label={a.actorRole.replace("_", " ")}
                    tone={toneForActor(a.actorRole)}
                  />
                </td>
                <td className="px-5 py-3.5 text-xs font-mono text-text-secondary whitespace-nowrap">
                  {a.ipAddress ?? "—"}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </>
  );
}
