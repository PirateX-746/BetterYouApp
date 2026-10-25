"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  ChevronRight,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Page, PageHeader } from "@/components/common/PageLayout";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/common/Field";
import { SkeletonRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { api } from "@/lib/api";
import { Patient, PatientView } from "@/types/patient";
import {
  calculateAge,
  formatDate,
  getPatientDisplayName,
} from "@/lib/patientUtils";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type FilterStatus = "all" | "active" | "inactive";

/* ─────────────────────────────────────────────
   Field style shared across add-patient form
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   Desktop table column definitions
───────────────────────────────────────────── */
const patientColumns: DataTableColumn<PatientView>[] = [
  {
    key: "patient",
    header: "Patient",
    width: "28%",
    sortValue: (p) => p.displayName,
    render: (p) => (
      <div className="flex items-center gap-3 min-w-0">
        <Avatar patient={p} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
            {p.displayName}
          </p>
          <p className="text-xs text-text-secondary truncate">{p.email ?? "—"}</p>
        </div>
      </div>
    ),
  },
  {
    key: "age",
    header: "Age",
    width: "9%",
    // Age ascending = date of birth descending.
    sortValue: (p) => (p.dateOfBirth ? -new Date(p.dateOfBirth).getTime() : null),
    className: "text-sm text-text-secondary whitespace-nowrap",
    render: (p) => calculateAge(p.dateOfBirth),
  },
  {
    key: "gender",
    header: "Gender",
    width: "10%",
    sortValue: (p) => p.gender,
    render: (p) =>
      p.gender ? (
        <GenderBadge gender={p.gender} />
      ) : (
        <span className="text-text-disabled text-sm">—</span>
      ),
  },
  {
    key: "phone",
    header: "Phone",
    width: "13%",
    className: "text-sm text-text-secondary whitespace-nowrap",
    render: (p) => p.phoneNo ?? "—",
  },
  {
    key: "healthCondition",
    header: "Health condition",
    width: "16%",
    sortValue: (p) => p.healthCondition,
    className: "text-sm text-text-secondary truncate max-w-[220px]",
    render: (p) =>
      p.healthCondition || <span className="text-text-disabled">—</span>,
  },
  {
    key: "lastVisit",
    header: "Last visit",
    width: "12%",
    sortValue: (p) => (p.lastVisit ? new Date(p.lastVisit) : null),
    firstSortDirection: "desc",
    className: "text-sm text-text-secondary whitespace-nowrap",
    render: (p) => formatDate(p.lastVisit),
  },
  {
    key: "status",
    header: "Status",
    width: "10%",
    sortValue: (p) => (p.isActive === false ? 1 : 0),
    render: (p) => <StatusBadge active={p.isActive} />,
  },
  {
    key: "chevron",
    header: "",
    // Fixed, not a percentage: the cell's px-5 padding alone is 40px, so a
    // percentage width squeezed the icon against the card's right edge.
    width: "60px",
    align: "right",
    render: () => (
      <ChevronRight
        size={15}
        className="text-text-disabled opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all"
      />
    ),
  },
];

/* ═══════════════════════════════════════════
   Main Page
═══════════════════════════════════════════ */
export default function PatientsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  /* Fetch */
  useEffect(() => {
    api
      .get("/patients")
      .then((res) =>
        setPatients(
          Array.isArray(res.data) ? res.data : (res.data.patients ?? []),
        ),
      )
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  /* Filter + search */
  const filtered: PatientView[] = useMemo(() => {
    return patients
      .map((p) => ({ ...p, displayName: getPatientDisplayName(p) }))
      .filter((p) => {
        const matchSearch = p.displayName
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchStatus =
          filterStatus === "all"
            ? true
            : filterStatus === "active"
              ? p.isActive !== false
              : p.isActive === false;
        return matchSearch && matchStatus;
      });
  }, [patients, search, filterStatus]);

  /* ── Loading: show skeleton table instead of spinner ── */
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="h-6 w-24 bg-bg-light rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-bg-light rounded-lg animate-pulse mt-1.5" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-48 bg-bg-light rounded-xl animate-pulse" />
            <div className="h-9 w-20 bg-bg-light rounded-xl animate-pulse" />
            <div className="h-9 w-28 bg-bg-light rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden hidden lg:block">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
        <div className="flex flex-col gap-2 lg:hidden">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <Page fill>
      {/* ── Header ── */}
      {/* Finding (search, filter) on the left; the primary action on the right. */}
      <PageHeader
        title="Patients"
        toolbar={
          <>
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" aria-hidden />
              <input
                type="search"
                aria-label="Search patients"
                placeholder="Search patients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-9 pr-9`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded text-text-light hover:text-text-primary transition-colors"
                >
                  <X size={13} aria-hidden />
                </button>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={showFilters || filterStatus !== "all" ? "border-primary/40 bg-primary/10 text-primary-strong hover:bg-primary/15" : ""}
            >
              <SlidersHorizontal aria-hidden />
              <span className="hidden sm:inline">Filter</span>
              {filterStatus !== "all" && <span className="size-1.5 rounded-full bg-primary" aria-label="Filter active" />}
            </Button>
          </>
        }
        actions={
          <Button asChild>
            <Link href="/patients/new">
              <Plus aria-hidden />
              Add patient
            </Link>
          </Button>
        }
      />

      {/* ── Filter bar ── */}
      {showFilters && (
        <div className="flex items-center gap-2 p-3 bg-bg-card border border-border rounded-xl">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide mr-1">
            Status
          </span>
          {(["all", "active", "inactive"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                filterStatus === s
                  ? "bg-primary text-white"
                  : "bg-bg-page border border-border text-text-secondary hover:border-primary/50 hover:text-text-primary"
              }`}
            >
              {s}
            </button>
          ))}
          {filterStatus !== "all" && (
            <button
              onClick={() => setFilterStatus("all")}
              className="ml-auto text-xs text-text-disabled hover:text-text-primary transition flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl">
          <EmptyState
            icon={Users}
            title={search || filterStatus !== "all" ? "No matching patients" : "No patients yet"}
            description={
              search || filterStatus !== "all"
                ? "Try adjusting your search or filters."
                : "Add your first patient to get started."
            }
            action={
              !search && filterStatus === "all"
                ? { label: "Add Patient", onClick: () => router.push("/patients/new") }
                : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* ── Mobile / tablet cards (below the sidebar breakpoint) ── */}
          <div className="flex flex-col gap-2 lg:hidden flex-1 min-h-0 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p._id}
                onClick={() => router.push(`/patients/${p._id}`)}
                className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3 text-left hover:border-primary/40 hover:shadow-sm transition-all group w-full"
              >
                <Avatar patient={p} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">
                    {p.displayName}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {calculateAge(p.dateOfBirth)}
                    {p.gender ? ` · ${p.gender}` : ""}
                  </p>
                  <p className="text-xs text-text-disabled truncate mt-0.5">
                    {p.email ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge active={p.isActive} />
                  <ChevronRight
                    size={15}
                    className="text-text-disabled group-hover:text-primary transition"
                  />
                </div>
              </button>
            ))}
          </div>

          {/* ── Desktop data table (aligned to the sidebar's lg breakpoint) ── */}
          <DataTable
            fill
            className="hidden lg:flex"
            columns={patientColumns}
            data={filtered}
            getRowId={(p) => p._id}
            onRowClick={(p) => router.push(`/patients/${p._id}`)}
            footer={
              <p className="text-footnote text-text-secondary tabular-nums">
                {filtered.length === patients.length
                  ? `${patients.length} patients`
                  : `${filtered.length} of ${patients.length} patients match`}
              </p>
            }
          />
        </>
      )}

    </Page>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════ */

function Avatar({ patient }: { patient: PatientView }) {
  if (patient.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={patient.avatar}
        alt={patient.displayName}
        className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-semibold shrink-0">
      {patient.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ active }: { active?: boolean }) {
  return (
    <Badge tone={active !== false ? "success" : "neutral"}>
      {active !== false ? "Active" : "Inactive"}
    </Badge>
  );
}

function GenderBadge({ gender }: { gender: string }) {
  const lower = gender.toLowerCase();
  const tone: BadgeTone =
    lower === "male" ? "primary" : lower === "female" ? "purple" : "neutral";
  return (
    <Badge tone={tone} className="capitalize">
      {gender}
    </Badge>
  );
}
