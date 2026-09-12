"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Building2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PageHeader,
  StatusPill,
  Panel,
  TableShell,
  LoadingState,
  ErrorState,
  EmptyState,
  toneForPracticeStatus,
} from "@/components/containers/superadmin/console-ui";
import {
  createPractice,
  fetchPractices,
  formatDate,
  useAsync,
  type PracticeStatus,
} from "@/lib/superadmin/api";

const FILTERS: Array<{ label: string; value: PracticeStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Trial", value: "TRIAL" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const RESERVED = ["www", "api", "admin", "app", "mail", "static", "assets"];

export default function PracticesPage() {
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(fetchPractices, []);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PracticeStatus | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    ownerName: "",
    ownerEmail: "",
  });

  const practices = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return practices.filter((p) => {
      const matchesStatus = status === "ALL" || p.status === status;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.subdomain.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [practices, query, status]);

  async function handleCreate() {
    setSaving(true);
    try {
      const created = await createPractice(form);
      toast.success(`${created.name} onboarded`);
      setCreateOpen(false);
      setForm({ name: "", subdomain: "", ownerName: "", ownerEmail: "" });
      reload();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg[0] : (msg ?? "Could not create the practice"),
      );
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    form.name.trim().length > 1 &&
    form.subdomain.trim().length > 2 &&
    form.ownerName.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(form.ownerEmail);

  return (
    <>
      <PageHeader
        title="Practices"
        subtitle={
          loading
            ? "Loading…"
            : `${filtered.length} of ${practices.length} practices`
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} />
            Onboard practice
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
          />
          <input
            id="practice-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, subdomain or email…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-bg-card text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                status === f.value
                  ? "bg-purple text-white"
                  : "bg-bg-card border border-border text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Panel title="All practices">
        {loading ? (
          <LoadingState label="Loading practices…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : practices.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No practices yet"
            hint="Onboard the first one to create its subdomain and invite its admin."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No practices match"
            hint="Try a different search or filter."
          />
        ) : (
          <TableShell
            headers={[
              "Practice",
              "Subdomain",
              "Contact",
              "Practitioners",
              "Patients",
              "Created",
              "Status",
            ]}
          >
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/admin/practices/${p.id}`)}
                className="hover:bg-bg-hover transition-colors cursor-pointer group"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-light text-purple flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-text-secondary">
                    {p.subdomain}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm text-text-secondary truncate">
                    {p.email ?? "—"}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary tabular-nums">
                  {p.practitioners}
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary tabular-nums">
                  {p.patients.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                  {formatDate(p.createdAt)}
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill
                    label={p.status}
                    tone={toneForPracticeStatus(p.status)}
                  />
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onboard a practice</DialogTitle>
            <DialogDescription>
              Creates the practice and its subdomain. No password is ever set
              or shown here — the admin is invited separately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="practice-name">Organisation name</Label>
              <Input
                id="practice-name"
                placeholder="ABC Wellness Clinic"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="practice-subdomain">Subdomain</Label>
              <Input
                id="practice-subdomain"
                placeholder="abc"
                value={form.subdomain}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subdomain: e.target.value.toLowerCase().replace(/\s/g, ""),
                  })
                }
              />
              <p className="text-xs text-text-disabled">
                Lowercase letters, digits and hyphens. Permanent once created.
                Reserved: {RESERVED.join(", ")}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="owner-name">Primary admin</Label>
              <Input
                id="owner-name"
                placeholder="Dr. John Smith"
                value={form.ownerName}
                onChange={(e) =>
                  setForm({ ...form, ownerName: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="owner-email">Admin email</Label>
              <Input
                id="owner-email"
                type="email"
                placeholder="john@abcwellness.in"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm({ ...form, ownerEmail: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canSubmit || saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Create practice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
