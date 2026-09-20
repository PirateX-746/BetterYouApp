"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "next/navigation";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { usePractitionerBreadcrumb } from "@/contexts/PractitionerBreadcrumbContext";
import {
  User,
  Calendar,
  Phone,
  Mail,
  HeartPulse,
  Droplet,
  AlertTriangle,
  ShieldPlus,
  Printer,
  Pencil,
  ClipboardList,
  Pill,
  ArrowLeft,
  TrendingUp,
  CalendarClock,
  Target,
  History,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { calculateAge, formatDate, capitalizeWords } from "@/lib/patientUtils";
import MedicationsTab from "./patientTabs/Medications";
import MedicalDocument from "./patientTabs/MedicalDocuments";
import AppointmentHistory from "./patientTabs/AppointmentHistory";
import ProgressNotesTab from "./patientTabs/ProgressNotes";
import FollowUpNotesTab from "./patientTabs/FollowUpNotes";
import TreatmentPlansTab from "./patientTabs/TreatmentPlans";
import PatientTimelineTab from "./patientTabs/PatientTimeline";
import ProgressScoreChart from "./ProgressScoreChart";
import { SkeletonProfile } from "@/components/ui/skeleton";

type Tab = "documents" | "medications" | "appointments" | "progress" | "followup" | "plans" | "timeline";

type Patient = {
  _id?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNo?: string;
  email?: string;
  lastVisit?: string;
  healthCondition?: string;
  bloodGroup?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  isActive?: boolean;
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "documents", label: "Documents", icon: ClipboardList },
  { id: "medications", label: "Medications", icon: Pill },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "progress", label: "Progress Notes", icon: TrendingUp },
  { id: "followup", label: "Follow-Ups", icon: CalendarClock },
  { id: "plans", label: "Treatment Plans", icon: Target },
  { id: "timeline", label: "Timeline", icon: History },
];

export default function PatientProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/patients/${id}`)
      .then((res) => setPatient(res.data ?? null))
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [id]);

  const fullName = useMemo(() => {
    if (!patient) return "";
    return `${capitalizeWords(patient.firstName ?? "")} ${capitalizeWords(patient.lastName ?? "")}`.trim();
  }, [patient]);

  const { setExtraCrumb } = usePractitionerBreadcrumb();
  useEffect(() => {
    setExtraCrumb(fullName || null);
    return () => setExtraCrumb(null);
  }, [fullName, setExtraCrumb]);

  const shortId = patient?._id?.slice(-6) ?? "—";

  if (loading) {
    return (
      <div className="space-y-4 w-full">
        <div className="h-4 w-28 bg-bg-light rounded-lg animate-pulse" />
        <SkeletonProfile />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-bg-light animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-16 bg-bg-light rounded animate-pulse" />
                <div className="h-4 w-24 bg-bg-light rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-bg-card border border-border rounded-2xl h-48 animate-pulse" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <User size={36} className="text-text-disabled" />
        <p className="text-text-secondary text-sm">Patient not found</p>
        <Link href="/patients" className="text-primary text-sm hover:underline">
          Back to Patients
        </Link>
      </div>
    );
  }

  const medicalInfo = [
    {
      label: "Health Condition",
      value: patient.healthCondition || "No condition recorded",
      icon: HeartPulse,
      colorClass: "bg-primary/10 text-primary",
    },
    {
      label: "Blood Group",
      value: patient.bloodGroup || "Not specified",
      icon: Droplet,
      colorClass: "bg-danger/10 text-danger",
    },
    {
      label: "Allergies",
      value: patient.allergies || "None reported",
      icon: AlertTriangle,
      colorClass: "bg-warning/10 text-warning",
    },
    {
      label: "Emergency Contact",
      value: patient.emergency_contact_name || "Not provided",
      sub: patient.emergency_contact_phone,
      icon: ShieldPlus,
      colorClass: "bg-purple-500/10 text-purple-500",
    },
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Back */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition"
      >
        <ArrowLeft size={15} />
        Back to Patients
      </Link>

      {/* Profile header card */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        {/* Cover */}
        <div className="h-20 bg-gradient-to-r from-primary/15 to-primary/5" />

        <div className="px-4 md:px-6 pb-5 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl border-4 border-bg-card bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shadow-sm shrink-0 overflow-hidden">
                {patient.avatar ? (
                  <img
                    src={patient.avatar}
                    alt={fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  fullName.charAt(0).toUpperCase() || "P"
                )}
              </div>

              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-text-primary">
                    {fullName || "Unnamed Patient"}
                  </h1>
                  <span className="text-xs text-text-disabled font-mono">
                    #{shortId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${patient.isActive !== false ? "bg-success/10 text-success" : "bg-border text-text-secondary"}`}
                  >
                    {patient.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Detail chips */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {[
                    { icon: User, value: patient.gender || "—" },
                    {
                      icon: Calendar,
                      value: `${calculateAge(patient.dateOfBirth)}`,
                    },
                    { icon: Phone, value: patient.phoneNo || "—" },
                    { icon: Mail, value: patient.email || "—" },
                    {
                      icon: Calendar,
                      value: `Last visit: ${formatDate(patient.lastVisit)}`,
                    },
                  ].map(({ icon: Icon, value }, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs text-text-secondary"
                    >
                      <Icon size={12} className="opacity-60 shrink-0" />
                      <span className="truncate max-w-[160px]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:pb-1">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition"
              >
                <Pencil size={14} />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Medical info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {medicalInfo.map(({ label, value, sub, icon: Icon, colorClass }) => (
          <div
            key={label}
            className="bg-bg-card border border-border rounded-2xl p-4 flex items-start gap-3"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 truncate">
                {value}
              </p>
              {sub && <p className="text-xs text-text-secondary">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Progress score chart (only renders if patient has scored notes) */}
      {id && <ProgressScoreChart patientId={id} />}

      {/* Tabs */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border scrollbar-hide">
          {TABS.map(({ id: tabId, label, icon: Icon }) => {
            const active = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {activeTab === "documents" && <MedicalDocument patientId={id} />}
          {activeTab === "medications" && <MedicationsTab />}
          {activeTab === "appointments" && <AppointmentHistory />}
          {activeTab === "progress" && <ProgressNotesTab />}
          {activeTab === "followup" && <FollowUpNotesTab />}
          {activeTab === "plans" && <TreatmentPlansTab />}
          {activeTab === "timeline" && <PatientTimelineTab />}
        </div>
      </div>

      {editOpen && patient && (
        <EditPatientDialog
          patient={patient}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => { setPatient(updated); setEditOpen(false); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Edit Patient Dialog
══════════════════════════════════════════════ */
const editSchema = z.object({
  firstName:       z.string().min(1, "Required"),
  lastName:        z.string().min(1, "Required"),
  email:           z.string().email("Enter a valid email"),
  phoneNo:         z.string().optional(),
  dateOfBirth:     z.string().optional(),
  gender:          z.enum(["male", "female", "other", ""]).optional(),
  bloodGroup:      z.string().optional(),
  healthCondition: z.string().optional(),
  allergies:       z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

const fieldCls =
  "w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-bg-page text-text-primary placeholder:text-text-disabled focus:border-primary focus:ring-1 focus:ring-primary outline-none transition";

function EditPatientDialog({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient;
  onClose: () => void;
  onSaved: (p: Patient) => void;
}) {
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName:       patient.firstName ?? "",
      lastName:        patient.lastName ?? "",
      email:           patient.email ?? "",
      phoneNo:         patient.phoneNo ?? "",
      dateOfBirth:     patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "",
      gender:          (patient.gender?.toLowerCase() as EditValues["gender"]) ?? "",
      bloodGroup:      patient.bloodGroup ?? "",
      healthCondition: patient.healthCondition ?? "",
      allergies:       patient.allergies ?? "",
    },
  });

  const onSubmit = async (data: EditValues) => {
    setServerError("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.phoneNo) delete payload.phoneNo;
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      if (!payload.gender) delete payload.gender;
      const res = await api.patch(`/patients/${patient._id}`, payload);
      onSaved(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? "Failed to update patient."));
    } finally {
      setSaving(false);
    }
  };

  const fieldErr = (f: keyof EditValues) =>
    errors[f]?.message ? <p className="text-xs text-danger mt-1">{errors[f]!.message}</p> : null;

  useEscapeToClose(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-bg-card rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Edit Patient</h2>
            <p className="text-xs text-text-secondary mt-0.5">Update patient information</p>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">First Name <span className="text-danger">*</span></label>
                <input {...register("firstName")} className={`${fieldCls} mt-1.5`} />
                {fieldErr("firstName")}
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Last Name <span className="text-danger">*</span></label>
                <input {...register("lastName")} className={`${fieldCls} mt-1.5`} />
                {fieldErr("lastName")}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Email <span className="text-danger">*</span></label>
              <input {...register("email")} type="email" className={`${fieldCls} mt-1.5`} />
              {fieldErr("email")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Phone</label>
                <input {...register("phoneNo")} type="tel" className={`${fieldCls} mt-1.5`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Date of Birth</label>
                <input {...register("dateOfBirth")} type="date" className={`${fieldCls} mt-1.5`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Gender</label>
                <select {...register("gender")} className={`${fieldCls} mt-1.5`}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Blood Group</label>
                <select {...register("bloodGroup")} className={`${fieldCls} mt-1.5`}>
                  <option value="">Select</option>
                  {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Health Condition</label>
              <input {...register("healthCondition")} placeholder="e.g. Generalised Anxiety Disorder" className={`${fieldCls} mt-1.5`} />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Allergies</label>
              <textarea {...register("allergies")} rows={2} placeholder="Known allergies" className={`${fieldCls} mt-1.5 resize-none`} />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
