"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { Modal } from "@/components/common/Modal";
import { Page } from "@/components/common/PageLayout";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { Field, FieldGroup, inputClass, textareaClass } from "@/components/common/Field";
import { Segmented, TabBar, tabPanelProps, type TabItem } from "@/components/common/Tabs";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { TemporaryPasswordDialog, type IssuedPassword } from "@/components/containers/patients/TemporaryPasswordDialog";
import toast from "react-hot-toast";
import { useDetailCrumb } from "@/contexts/PractitionerBreadcrumbContext";
import {
  User,
  AlertTriangle,
  Printer,
  Pencil,
  ArrowLeft,
  CalendarClock,
  HeartPulse,
  Droplet,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { calculateAge, formatDate, capitalizeWords } from "@/lib/patientUtils";
import MedicationsTab from "./patientTabs/Medications";
import MedicalDocument from "./patientTabs/MedicalDocuments";
import AppointmentHistory from "./patientTabs/AppointmentHistory";
import SessionNotesTab from "./patientTabs/SessionNotes";
import EmrAllNotes, { type EmrItem } from "./patientTabs/EmrAllNotes";
import TreatmentPlansTab from "./patientTabs/TreatmentPlans";
import PatientOverview from "./patientTabs/PatientOverview";
import PatientDetails from "./patientTabs/PatientDetails";
import PatientAssessments from "./patientTabs/PatientAssessments";
import { emergencyName, emergencyPhone, type Patient } from "./types";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "dashboard" | "patient" | "emr" | "care" | "appointments";

/** EMR Notes groups the patient's clinical record: session notes (with their
    follow-up plan), session assessments and documents. */
type EmrView = "all" | "notes" | "assessments" | "documents";

/* Five questions, one tab each: what's going on (Dashboard), who they are
   (Patient), what was recorded (EMR Notes), what the plan is (Care Plan),
   when they're seen (Appointments). History lives on the Dashboard as
   Recent activity, not in its own tab. */
const TABS: TabItem<Tab>[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "patient", label: "Patient" },
  { id: "emr", label: "EMR Notes" },
  { id: "care", label: "Care Plan" },
  { id: "appointments", label: "Appointments" },
];

export default function PatientProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const tabsId = useId();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const router = useRouter();
  const [emrView, setEmrView] = useState<EmrView>("all");
  /** A record picked in EMR → All, opened in its own view. */
  const [focusNote, setFocusNote] = useState<string | undefined>();
  const [focusDoc, setFocusDoc] = useState<string | undefined>();
  const openEmrItem = (item: EmrItem) => {
    if (item.kind === "assessment") {
      if (item.appointmentId) router.push(`/assessments?appointment=${item.appointmentId}`);
      else setEmrView("assessments");
    } else if (item.kind === "note") {
      setFocusNote(item.id);
      setEmrView("notes");
    } else {
      setFocusDoc(item.id);
      setEmrView("documents");
    }
  };
  const [careView, setCareView] = useState<"plans" | "medications">("plans");
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
        emailed: !!data.emailed,
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

  if (loading) {
    return (
      <Page>
        <Card className="p-5 space-y-4" aria-busy="true" aria-label="Loading patient">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-28 rounded-full" />)}
          </div>
          <Skeleton className="h-10 w-full" />
        </Card>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </Page>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <User size={36} className="text-text-light" aria-hidden />
        <p className="text-text-secondary text-body">Patient not found</p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/patients">Back to Patients</Link>
        </Button>
      </div>
    );
  }

  const active = patient.isActive !== false;
  const recordId = patient.mrn || `#${patient._id?.slice(-6) ?? "—"}`;
  const facts: { label: string; value: string }[] = [
    { label: "Sex", value: patient.gender ? capitalizeWords(patient.gender) : "—" },
    { label: "Age", value: patient.dateOfBirth ? calculateAge(patient.dateOfBirth).replace(" yrs", "") : "—" },
    { label: "DoB", value: patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—" },
    { label: patient.mrn ? "MRN" : "ID", value: recordId },
  ];

  return (
    <Page className="gap-5">
      {/* Mobile only — on desktop the topbar breadcrumb already leads back. */}
      <Link
        href="/patients"
        className="lg:hidden self-start inline-flex items-center gap-1.5 h-9 -mb-2 text-footnote font-medium text-text-secondary hover:text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors no-print"
      >
        <ArrowLeft size={16} aria-hidden />
        Patients
      </Link>

      {/* Identity strip + record tabs: one surface, like the chart header of a record. */}
      {/* Tinted: the record header is the one place on this page with a brand wash. */}
      <Card as="div" variant="tinted" className="overflow-hidden no-print">
        <div className="px-4 sm:px-6 pt-5 pb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="size-14 rounded-full bg-brand text-white shadow-brand grid place-items-center text-title-2 font-semibold overflow-hidden shrink-0" aria-hidden>
              {patient.avatar ? (
                <img
                  src={patient.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                fullName.charAt(0).toUpperCase() || "P"
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-title-1 font-semibold text-text-primary break-words">{fullName || "Unnamed Patient"}</h1>
                <Badge tone={active ? "success" : "neutral"} dot>{active ? "Active" : "Inactive"}</Badge>
              </div>
              <dl className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-baseline gap-1.5">
                    <dt className="text-caption text-text-secondary">{f.label}</dt>
                    <dd className={`text-body font-medium text-text-primary tabular-nums ${f.label === "MRN" || f.label === "ID" ? "font-mono text-footnote" : ""}`}>
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden /> Edit patient
            </Button>
            {/* Patient portal is off until the next phase, so patients can't sign in
                yet and there's nothing to reset. Re-enable with the portal (and import
                KeyRound from lucide-react).
            <Button variant="secondary" size="sm" onClick={() => setResetConfirm(true)}>
              <KeyRound aria-hidden /> Reset password
            </Button>
            */}
            <Button variant="ghost" size="icon-sm" onClick={() => window.print()} aria-label="Print summary" title="Print summary">
              <Printer aria-hidden />
            </Button>
          </div>
        </div>

        {/* Clinical flags: the facts a clinician must not miss, always in view. */}
        <ul aria-label="Clinical flags" className="px-4 sm:px-6 pb-4 flex flex-wrap gap-2">
          <li>
            {patient.allergies ? (
              <Badge tone="warning" icon={<AlertTriangle size={13} aria-hidden />} className="max-w-[22rem]">
                <span className="truncate">Allergies: {patient.allergies}</span>
              </Badge>
            ) : (
              <Badge tone="neutral">Allergies not recorded</Badge>
            )}
          </li>
          {patient.healthCondition && (
            <li>
              <Badge tone="primary" icon={<HeartPulse size={13} aria-hidden />} className="max-w-[22rem]">
                <span className="truncate">{patient.healthCondition}</span>
              </Badge>
            </li>
          )}
          {patient.bloodGroup && (
            <li>
              <Badge tone="neutral" icon={<Droplet size={13} aria-hidden />}>Blood {patient.bloodGroup}</Badge>
            </li>
          )}
          <li>
            <Badge tone="neutral" icon={<CalendarClock size={13} aria-hidden />}>
              {patient.lastVisit ? `Last visit ${formatDate(patient.lastVisit)}` : "No visits yet"}
            </Badge>
          </li>
        </ul>

        <TabBar
          items={TABS}
          value={activeTab}
          onChange={setActiveTab}
          label="Patient record"
          idBase={tabsId}
          className="px-2 sm:px-4 border-t border-primary/10 border-b-0 bg-bg-card"
        />
      </Card>

      <div {...tabPanelProps(tabsId, activeTab)} className="focus-visible:outline-none no-print">
        {activeTab === "dashboard" && <PatientOverview patient={patient} patientId={id} onOpenTab={setActiveTab} />}
        {activeTab === "patient" && <PatientDetails patient={patient} onEdit={() => setEditOpen(true)} />}
        {activeTab === "emr" && (
          <Card className="p-4 md:p-5 space-y-5">
            <Segmented
              label="EMR notes"
              value={emrView}
              onChange={(v) => {
                setFocusNote(undefined);
                setFocusDoc(undefined);
                setEmrView(v);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "notes", label: "Session notes" },
                { value: "assessments", label: "Assessments" },
                { value: "documents", label: "Documents" },
              ]}
            />
            {emrView === "all" && <EmrAllNotes patientId={id} onOpen={openEmrItem} />}
            {emrView === "notes" && <SessionNotesTab focusId={focusNote} />}
            {emrView === "assessments" && <PatientAssessments patientId={id} />}
            {emrView === "documents" && <MedicalDocument patientId={id} openId={focusDoc} />}
          </Card>
        )}
        {/* Care Plan: what the patient is on now — goals and medications. */}
        {activeTab === "care" && (
          <Card className="p-4 md:p-5 space-y-5">
            <Segmented
              label="Care plan"
              value={careView}
              onChange={setCareView}
              options={[
                { value: "plans", label: "Treatment plans" },
                { value: "medications", label: "Medications" },
              ]}
            />
            {careView === "plans" && <TreatmentPlansTab />}
            {careView === "medications" && <MedicationsTab />}
          </Card>
        )}
        {activeTab === "appointments" && (
          <Card className="p-4 md:p-5">
            <AppointmentHistory />
          </Card>
        )}
      </div>

      {/*
        Print scope: a plain summary of the record, not the interactive tabs.
        The @media print block in globals.css hides everything but this id.
      */}
      <PrintSummary patient={patient} fullName={fullName} recordId={recordId} />

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

function PrintSummary({ patient, fullName, recordId }: { patient: Patient; fullName: string; recordId: string }) {
  const rows: [string, string][] = [
    ["Gender", patient.gender ? capitalizeWords(patient.gender) : "—"],
    ["Date of birth", patient.dateOfBirth ? `${formatDate(patient.dateOfBirth)} (${calculateAge(patient.dateOfBirth)})` : "—"],
    ["Phone", patient.phoneNo || "—"],
    ["Email", patient.email || "—"],
    ["Last visit", formatDate(patient.lastVisit)],
    ["Health condition", patient.healthCondition || "No condition recorded"],
    ["Blood group", patient.bloodGroup || "Not specified"],
    ["Allergies", patient.allergies || "Not recorded"],
    [
      "Emergency contact",
      [emergencyName(patient), patient.emergencyContactRelation && `(${patient.emergencyContactRelation})`, emergencyPhone(patient)]
        .filter(Boolean)
        .join(" ") || "Not provided",
    ],
  ];
  return (
    <div id="printable-document" className="hidden print:block">
      <div className="document-meta">
        <h1 className="clinic-name">{fullName || "Unnamed Patient"}</h1>
        <p className="meta-sub">
          {recordId} · {patient.isActive !== false ? "Active" : "Inactive"}
        </p>
      </div>
      <div className="section-block">
        <p className="section-title">
          <FileText size={12} className="inline mr-1" aria-hidden />
          Patient summary
        </p>
        <div className="section-grid">
          {rows.map(([k, v]) => (
            <div key={k}>
              <p className="field-label">{k}</p>
              <p className="field-value">{v}</p>
            </div>
          ))}
        </div>
      </div>
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
  emergencyContactName:     z.string().max(100, "Too long").optional(),
  emergencyContactRelation: z.string().max(40, "Too long").optional(),
  emergencyContactPhone:    z.string().regex(/^([0-9+()\-\s]{7,20})?$/, "Enter a valid phone number").optional(),
});
type EditValues = z.infer<typeof editSchema>;

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

  const err = (f: keyof EditValues) => errors[f]?.message;

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit patient"
      subtitle="Changes apply to the patient record immediately."
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-patient-form" loading={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      }
    >
      <form id="edit-patient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {serverError && (
          <div role="alert" className="flex items-start gap-2 text-body text-danger-strong bg-danger-light px-3.5 py-2.5 rounded-xl">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}

        <FieldGroup legend="Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" htmlFor="ep-first" required error={err("firstName")}>
              <input id="ep-first" {...register("firstName")} aria-invalid={!!errors.firstName} className={inputClass} />
            </Field>
            <Field label="Last name" htmlFor="ep-last" required error={err("lastName")}>
              <input id="ep-last" {...register("lastName")} aria-invalid={!!errors.lastName} className={inputClass} />
            </Field>
            <Field label="Date of birth" htmlFor="ep-dob">
              <input id="ep-dob" {...register("dateOfBirth")} type="date" className={inputClass} />
            </Field>
            <Field label="Gender" htmlFor="ep-gender">
              <select id="ep-gender" {...register("gender")} className={inputClass}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
        </FieldGroup>

        <FieldGroup legend="Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email" htmlFor="ep-email" required error={err("email")} className="sm:col-span-2">
              <input id="ep-email" {...register("email")} type="email" aria-invalid={!!errors.email} className={inputClass} />
            </Field>
            <Field label="Phone" htmlFor="ep-phone">
              <input id="ep-phone" {...register("phoneNo")} type="tel" className={inputClass} />
            </Field>
          </div>
        </FieldGroup>

        <FieldGroup legend="Clinical">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_9rem] gap-3">
            <Field label="Health condition" htmlFor="ep-condition">
              <input id="ep-condition" {...register("healthCondition")} placeholder="e.g. Generalised Anxiety Disorder" className={inputClass} />
            </Field>
            <Field label="Blood group" htmlFor="ep-blood">
              <select id="ep-blood" {...register("bloodGroup")} className={inputClass}>
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Allergies" htmlFor="ep-allergies" hint="Shown as a flag at the top of the patient record.">
            <textarea id="ep-allergies" {...register("allergies")} rows={2} placeholder="Known allergies" className={textareaClass} />
          </Field>
        </FieldGroup>

        <FieldGroup legend="Emergency contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name" htmlFor="ec-name" error={err("emergencyContactName")}>
              <input id="ec-name" {...register("emergencyContactName")} className={inputClass} />
            </Field>
            <Field label="Relationship" htmlFor="ec-rel" error={err("emergencyContactRelation")}>
              <input id="ec-rel" {...register("emergencyContactRelation")} placeholder="e.g. Spouse" className={inputClass} />
            </Field>
            <Field label="Phone" htmlFor="ec-phone" error={err("emergencyContactPhone")}>
              <input id="ec-phone" type="tel" {...register("emergencyContactPhone")} aria-invalid={!!errors.emergencyContactPhone} className={inputClass} />
            </Field>
          </div>
        </FieldGroup>
      </form>
    </Modal>
  );
}
