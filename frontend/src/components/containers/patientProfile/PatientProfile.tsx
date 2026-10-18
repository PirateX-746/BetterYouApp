"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { Page } from "@/components/common/PageLayout";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { TemporaryPasswordDialog, type IssuedPassword } from "@/components/containers/patients/TemporaryPasswordDialog";
import toast from "react-hot-toast";
import { useDetailCrumb } from "@/contexts/PractitionerBreadcrumbContext";
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
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  /** Legacy field names some older records/types used. */
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
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);

  // Lost/expired temporary password: issue a new one. The old password stops
  // working immediately, so this sits behind a confirmation.
  const resetPassword = async () => {
    if (!patient) return;
    setResetting(true);
    try {
      const { data } = await api.post(`/patients/${patient._id}/temporary-password`);
      setResetConfirm(false);
      setIssued({
        patientName: `${patient.firstName} ${patient.lastName ?? ""}`.trim(),
        email: patient.email ?? "",
        temporaryPassword: data.temporaryPassword,
        expiresAt: data.temporaryPasswordExpiresAt,
      });
    } catch {
      toast.error("Couldn't reset the password. Try again.");
    } finally {
      setResetting(false);
    }
  };

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

  useDetailCrumb(fullName);

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
      value:
        [patient.emergencyContactName ?? patient.emergency_contact_name, patient.emergencyContactRelation && `(${patient.emergencyContactRelation})`]
          .filter(Boolean)
          .join(" ") || "Not provided",
      sub: patient.emergencyContactPhone ?? patient.emergency_contact_phone,
      icon: ShieldPlus,
      colorClass: "bg-purple/10 text-purple",
    },
  ];

  const actionBtn =
    "h-10 flex-1 inline-flex items-center justify-center gap-1.5 px-3 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer";

  const details = [
    { icon: User, label: "Gender", value: patient.gender ? capitalizeWords(patient.gender) : "—" },
    { icon: Calendar, label: "Age", value: calculateAge(patient.dateOfBirth) },
    { icon: Phone, label: "Phone", value: patient.phoneNo || "—" },
    { icon: Mail, label: "Email", value: patient.email || "—" },
    { icon: CalendarClock, label: "Last visit", value: formatDate(patient.lastVisit) },
  ];

  return (
    <Page>
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 h-11 -my-2 text-sm text-text-secondary hover:text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors no-print"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to Patients
      </Link>

      {/* Two panes: who the patient is (left, stays in view), their record (right). */}
      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] items-start">
        {/*
          Print scope: just this summary panel, not the tabs — those hold
          interactive lists/charts that don't make sense on paper. See the
          @media print block in globals.css, which hides everything but this id.
        */}
        <aside
          id="printable-document"
          aria-label="Patient details"
          className="bg-bg-card border border-border rounded-2xl overflow-hidden lg:sticky lg:top-0"
        >
          {/* Identity */}
          <div className="p-5 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold overflow-hidden">
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
            <h1 className="mt-3 text-lg font-semibold text-text-primary break-words">
              {fullName || "Unnamed Patient"}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-text-secondary font-mono">#{shortId}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${patient.isActive !== false ? "bg-success/10 text-success" : "bg-border text-text-secondary"}`}
              >
                {patient.isActive !== false ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-4 flex w-full gap-2 no-print">
              <button type="button" onClick={() => setEditOpen(true)} className={actionBtn}>
                <Pencil size={14} aria-hidden /> Edit
              </button>
              {/* Patient portal is off until the next phase, so patients can't sign in
                  yet and there's nothing to reset. Re-enable with the portal (and re-import
                  KeyRound from lucide-react).
              <button type="button" onClick={() => setResetConfirm(true)} className={actionBtn} aria-label="Reset patient's password" title="Reset password">
                <KeyRound size={14} aria-hidden /> Password
              </button>
              */}
              <button type="button" onClick={() => window.print()} className={actionBtn} aria-label="Print summary" title="Print summary">
                <Printer size={14} aria-hidden />
              </button>
            </div>
          </div>

          {/* Contact & demographics */}
          <dl className="border-t border-border px-5 py-4 space-y-3">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 text-sm">
                <Icon size={15} className="text-text-secondary mt-0.5 shrink-0" aria-hidden />
                <dt className="text-text-secondary w-20 shrink-0">{label}</dt>
                <dd className="text-text-primary min-w-0 truncate" title={String(value)}>{value}</dd>
              </div>
            ))}
          </dl>

          {/* Clinical summary */}
          <div className="border-t border-border px-5 py-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Clinical summary</h2>
            {medicalInfo.map(({ label, value, sub, icon: Icon, colorClass }) => (
              <div key={label} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon size={15} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className="text-sm font-medium text-text-primary break-words">{value}</p>
                  {sub && <p className="text-xs text-text-secondary">{sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Record */}
        <div className="space-y-5 min-w-0">
          {/* Progress score chart (only renders if patient has scored notes) */}
          {id && <ProgressScoreChart patientId={id} />}

          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div role="tablist" aria-label="Patient record" className="flex overflow-x-auto border-b border-border scrollbar-hide">
              {TABS.map(({ id: tabId, label, icon: Icon }) => {
                const active = activeTab === tabId;
                return (
                  <button
                    key={tabId}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tabId)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 h-12 text-sm font-medium transition-colors border-b-2 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Icon size={14} className="shrink-0" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" className="p-4 md:p-5">
              {activeTab === "documents" && <MedicalDocument patientId={id} />}
              {activeTab === "medications" && <MedicationsTab />}
              {activeTab === "appointments" && <AppointmentHistory />}
              {activeTab === "progress" && <ProgressNotesTab />}
              {activeTab === "followup" && <FollowUpNotesTab />}
              {activeTab === "plans" && <TreatmentPlansTab />}
              {activeTab === "timeline" && <PatientTimelineTab />}
            </div>
          </div>
        </div>
      </div>

      {editOpen && patient && (
        <EditPatientDialog
          patient={patient}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => { setPatient(updated); setEditOpen(false); }}
        />
      )}

      <ConfirmationDialog
        open={resetConfirm}
        onClose={() => !resetting && setResetConfirm(false)}
        onConfirm={() => void resetPassword()}
        title="Reset this patient's password?"
        description="Their current password stops working immediately. You'll get a new one-time password to give them, and they'll choose their own at next sign-in."
        confirmLabel="Reset password"
        loading={resetting}
      />
      <TemporaryPasswordDialog issued={issued} onClose={() => setIssued(null)} title="New temporary password" />
    </Page>
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
  emergencyContactName:     z.string().max(100, "Too long").optional(),
  emergencyContactRelation: z.string().max(40, "Too long").optional(),
  emergencyContactPhone:    z.string().regex(/^([0-9+()\-\s]{7,20})?$/, "Enter a valid phone number").optional(),
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
      emergencyContactName:     patient.emergencyContactName ?? patient.emergency_contact_name ?? "",
      emergencyContactRelation: patient.emergencyContactRelation ?? "",
      emergencyContactPhone:    patient.emergencyContactPhone ?? patient.emergency_contact_phone ?? "",
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

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Patient"
      subtitle="Update patient information"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border text-sm text-text-secondary hover:bg-bg-hover transition">
            Cancel
          </button>
          <button type="submit" form="edit-patient-form" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      }
    >
        <form id="edit-patient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <fieldset className="space-y-3 pt-1">
              <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Emergency contact</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ec-name" className="text-xs text-text-secondary">Name</label>
                  <input id="ec-name" {...register("emergencyContactName")} className={`${fieldCls} mt-1`} />
                </div>
                <div>
                  <label htmlFor="ec-rel" className="text-xs text-text-secondary">Relationship</label>
                  <input id="ec-rel" {...register("emergencyContactRelation")} placeholder="e.g. Spouse" className={`${fieldCls} mt-1`} />
                </div>
              </div>
              <div>
                <label htmlFor="ec-phone" className="text-xs text-text-secondary">Phone</label>
                <input id="ec-phone" type="tel" {...register("emergencyContactPhone")} className={`${fieldCls} mt-1`} />
                {errors.emergencyContactPhone && <p role="alert" className="text-xs text-danger mt-1">{errors.emergencyContactPhone.message}</p>}
              </div>
            </fieldset>
        </form>
    </Modal>
  );
}
