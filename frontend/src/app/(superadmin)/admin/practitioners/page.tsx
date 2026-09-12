"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Stethoscope } from "lucide-react";
import {
  PageHeader,
  StatusPill,
  Panel,
  TableShell,
  LoadingState,
  ErrorState,
  EmptyState,
  toneForUserStatus,
} from "@/components/containers/superadmin/console-ui";
import {
  fetchPlatformPractitioners,
  formatDate,
  useAsync,
} from "@/lib/superadmin/api";

const ROLES = ["ALL", "practice_admin", "practitioner", "staff"] as const;
type RoleFilter = (typeof ROLES)[number];

export default function PlatformPractitionersPage() {
  const { data, loading, error, reload } = useAsync(
    fetchPlatformPractitioners,
    [],
  );

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [practice, setPractice] = useState("ALL");

  const rows = useMemo(() => data ?? [], [data]);

  const practiceOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const u of rows) {
      if (u.practiceSubdomain && u.practiceName) {
        seen.set(u.practiceSubdomain, u.practiceName);
      }
    }
    return [...seen.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((u) => {
      const matchesRole =
        role === "ALL" || (u.role ?? "").toLowerCase() === role;
      const matchesPractice =
        practice === "ALL" || u.practiceSubdomain === practice;
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchesRole && matchesPractice && matchesQuery;
    });
  }, [rows, query, role, practice]);

  return (
    <>
      <PageHeader
        title="Practitioners"
        subtitle={
          loading
            ? "Loading…"
            : `${filtered.length} of ${rows.length} across all practices`
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
          />
          <input
            id="practitioner-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-bg-card text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary transition"
          />
        </div>

        {practiceOptions.length > 0 && (
          <select
            id="practice-filter"
            value={practice}
            onChange={(e) => setPractice(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-bg-card text-sm text-text-primary focus:outline-none focus:border-primary transition"
          >
            <option value="ALL">All practices</option>
            {practiceOptions.map(([sub, name]) => (
              <option key={sub} value={sub}>
                {name}
              </option>
            ))}
          </select>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                role === r
                  ? "bg-purple text-white"
                  : "bg-bg-card border border-border text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {r === "ALL" ? "All roles" : r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <Panel title="All practitioners">
        {loading ? (
          <LoadingState label="Loading practitioners…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No practitioners yet"
            hint="They appear here once a practice has staff."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No practitioners match"
            hint="Try a different search or filter."
          />
        ) : (
          <TableShell
            headers={["Name", "Role", "Practice", "Joined", "Status"]}
          >
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {u.name
                        .replace(/^Dr\.\s*/, "")
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {u.name || "—"}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-text-secondary">
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {u.practiceId ? (
                    <Link
                      href={`/admin/practices/${u.practiceId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {u.practiceName}
                    </Link>
                  ) : (
                    <span className="text-sm text-text-disabled">
                      Unassigned
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                  {formatDate(u.joinedAt)}
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill
                    label={u.status}
                    tone={toneForUserStatus(u.status)}
                  />
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </>
  );
}
