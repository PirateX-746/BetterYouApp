"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  ChevronRight,
  SlidersHorizontal,
  Users,
  Loader2,
} from "lucide-react";
import { addPatientSchema, type AddPatientValues } from "@/schemas/patient.schema";
import { SkeletonRow } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
const fieldCls =
  "w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-bg-page text-text-primary placeholder:text-text-disabled focus:border-primary focus:ring-1 focus:ring-primary outline-none transition";

/* ═══════════════════════════════════════════
   Main Page
═══════════════════════════════════════════ */
export default function PatientsPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
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
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Patients</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {filtered.length} of {patients.length} patient
            {patients.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-bg-card border border-border rounded-xl w-full sm:w-56 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-primary placeholder:text-text-disabled transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-primary transition"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm transition ${
              showFilters || filterStatus !== "all"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-text-secondary hover:bg-bg-hover"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filter</span>
            {filterStatus !== "all" && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {/* Add patient */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition shadow-sm shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Patient</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

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
                ? { label: "Add Patient", onClick: () => setModalOpen(true) }
                : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* ── Mobile / tablet cards (below the sidebar breakpoint) ── */}
          <div className="flex flex-col gap-2 lg:hidden">
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
          <div className="hidden lg:block bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide w-[28%]">
                      Patient
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide w-[10%]">
                      Age
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide w-[10%]">
                      Gender
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide w-[13%]">
                      Phone
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide w-[17%]">
                      Health Condition
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide w-[12%]">
                      Last Visit
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide w-[10%]">
                      Status
                    </th>
                    <th className="px-3 py-3.5 w-[2%]" aria-hidden />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr
                      key={p._id}
                      onClick={() => router.push(`/patients/${p._id}`)}
                      className="hover:bg-bg-hover transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar patient={p} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                              {p.displayName}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              {p.email ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle text-sm text-text-secondary whitespace-nowrap">
                        {calculateAge(p.dateOfBirth)}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        {p.gender ? (
                          <GenderBadge gender={p.gender} />
                        ) : (
                          <span className="text-text-disabled text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-middle text-sm text-text-secondary whitespace-nowrap">
                        {p.phoneNo ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 align-middle text-sm text-text-secondary truncate max-w-[220px]">
                        {p.healthCondition || <span className="text-text-disabled">—</span>}
                      </td>
                      <td className="px-5 py-3.5 align-middle text-sm text-text-secondary whitespace-nowrap">
                        {formatDate(p.lastVisit)}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <StatusBadge active={p.isActive} />
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <ChevronRight
                          size={15}
                          className="text-text-disabled opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-text-disabled">
                Showing {filtered.length} of {patients.length} patients
              </p>
              <p className="text-xs text-text-disabled">
                Click a row to view profile
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Add Patient Modal ── */}
      <AddPatientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(p) => setPatients((prev) => [p, ...prev])}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Add Patient Modal — react-hook-form + zod
═══════════════════════════════════════════ */
function AddPatientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Patient) => void;
}) {
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPatientValues>({
    resolver: zodResolver(addPatientSchema),
  });

  useEffect(() => {
    if (!open) { reset(); setServerError(""); }
  }, [open, reset]);

  if (!open) return null;

  const onSubmit = async (data: AddPatientValues) => {
    setServerError("");
    setSaving(true);
    try {
      const res = await api.post("/patients", {
        ...data,
        email: data.email.toLowerCase(),
        password: "Admin@123",
      });
      onCreated(res.data);
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? "Failed to create patient."));
    } finally {
      setSaving(false);
    }
  };

  const err = (field: keyof AddPatientValues) =>
    errors[field]?.message ? (
      <p className="text-xs text-danger mt-1">{errors[field]!.message}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-bg-card rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Add New Patient</h2>
            <p className="text-xs text-text-secondary mt-0.5">Default password is Admin@123</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-secondary transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {serverError && (
              <div className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 px-3.5 py-2.5 rounded-xl">
                <span className="mt-0.5 shrink-0">⚠</span>
                {serverError}
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  First Name <span className="text-danger">*</span>
                </label>
                <input {...register("firstName")} placeholder="John" className={`${fieldCls} mt-1.5`} />
                {err("firstName")}
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Last Name <span className="text-danger">*</span>
                </label>
                <input {...register("lastName")} placeholder="Doe" className={`${fieldCls} mt-1.5`} />
                {err("lastName")}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Email <span className="text-danger">*</span>
              </label>
              <input {...register("email")} type="email" placeholder="patient@example.com" className={`${fieldCls} mt-1.5`} />
              {err("email")}
            </div>

            {/* Phone + DOB */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Phone <span className="text-danger">*</span>
                </label>
                <input {...register("phoneNo")} type="tel" placeholder="9876543210" className={`${fieldCls} mt-1.5`} />
                {err("phoneNo")}
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Date of Birth <span className="text-danger">*</span>
                </label>
                <input {...register("dateOfBirth")} type="date" className={`${fieldCls} mt-1.5`} />
                {err("dateOfBirth")}
              </div>
            </div>

            {/* Gender + Blood Group */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Gender <span className="text-danger">*</span>
                </label>
                <select {...register("gender")} className={`${fieldCls} mt-1.5`}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {err("gender")}
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Blood Group <span className="text-danger">*</span>
                </label>
                <select {...register("bloodGroup")} className={`${fieldCls} mt-1.5`}>
                  <option value="">Select</option>
                  {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {err("bloodGroup")}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Allergies
              </label>
              <textarea {...register("allergies")} placeholder="Known allergies (optional)" rows={2} className={`${fieldCls} mt-1.5 resize-none`} />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
      {patient.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ active }: { active?: boolean }) {
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
        active !== false
          ? "bg-success/10 text-success"
          : "bg-border text-text-secondary"
      }`}
    >
      {active !== false ? "Active" : "Inactive"}
    </span>
  );
}

function GenderBadge({ gender }: { gender: string }) {
  const lower = gender.toLowerCase();
  const cls =
    lower === "male"
      ? "bg-primary/10 text-primary"
      : lower === "female"
        ? "bg-purple-500/10 text-purple-500"
        : "bg-bg-hover text-text-secondary";
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      {gender}
    </span>
  );
}
