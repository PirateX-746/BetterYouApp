"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Search,
  Plus,
  Loader2,
  X,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
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
const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNo: "",
  dateOfBirth: "",
  gender: "" as "" | "male" | "female" | "other",
  bloodGroup: "",
  allergies: "",
};

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

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
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
        <div className="bg-bg-card border border-border rounded-2xl p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="text-primary" size={26} />
          </div>
          <p className="font-semibold text-text-primary mb-1">
            No patients found
          </p>
          <p className="text-sm text-text-secondary mb-4">
            {search || filterStatus !== "all"
              ? "Try adjusting your search or filters."
              : "Get started by adding your first patient."}
          </p>
          {!search && filterStatus === "all" && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition"
            >
              <Plus size={15} />
              Add Patient
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="flex flex-col gap-2 md:hidden">
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

          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Patient",
                    "Age",
                    "Gender",
                    "Phone",
                    "Last Visit",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => router.push(`/patients/${p._id}`)}
                    className="hover:bg-bg-hover transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
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
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {calculateAge(p.dateOfBirth)}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.gender ? (
                        <GenderBadge gender={p.gender} />
                      ) : (
                        <span className="text-text-disabled text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {p.phoneNo ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">
                      {formatDate(p.lastVisit)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-between">
                        <StatusBadge active={p.isActive} />
                        <ChevronRight
                          size={15}
                          className="text-text-disabled opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
   Add Patient Modal (inline)
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
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* Reset on close */
  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const handle = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim())
      return setError("First and last name are required.");
    if (!form.email.trim()) return setError("Email is required.");

    setSaving(true);
    try {
      const res = await api.post("/patients", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNo: form.phoneNo.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
      });
      onCreated(res.data);
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "Failed to create patient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg bg-bg-card rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Add New Patient
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Fill in the details below
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-secondary transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 px-3.5 py-2.5 rounded-xl">
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  First Name <span className="text-danger">*</span>
                </label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handle}
                  placeholder="John"
                  className={fieldCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Last Name <span className="text-danger">*</span>
                </label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handle}
                  placeholder="Doe"
                  className={fieldCls}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Email <span className="text-danger">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handle}
                placeholder="patient@example.com"
                className={fieldCls}
              />
            </div>

            {/* Phone + DOB */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Phone
                </label>
                <input
                  name="phoneNo"
                  type="tel"
                  value={form.phoneNo}
                  onChange={handle}
                  placeholder="+91 00000 00000"
                  className={fieldCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Date of Birth
                </label>
                <input
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handle}
                  className={fieldCls}
                />
              </div>
            </div>

            {/* Gender + Blood Group */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Gender
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handle}
                  className={fieldCls}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Blood Group
                </label>
                <input
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={handle}
                  placeholder="e.g. O+"
                  className={fieldCls}
                />
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Allergies
              </label>
              <textarea
                name="allergies"
                value={form.allergies}
                onChange={handle}
                placeholder="Known allergies (optional)"
                rows={2}
                className={`${fieldCls} resize-none`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
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
