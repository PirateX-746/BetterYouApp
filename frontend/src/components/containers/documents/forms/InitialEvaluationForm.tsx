"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { calculateAge } from "@/lib/patientUtils";
import {
  SectionCard,
  FormGrid,
  FormInput,
  FormSelect,
  FormTextarea,
  InfoItem,
} from "@/components/containers/documents/forms/FormFields";

/* ── Types ── */
type Props = { patientId: string };

type Patient = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNo?: string;
};

type FormValues = {
  occupation: string;
  maritalStatus: string;
  education: string;
  referralSource: string;
  presentingComplaint: string;
  pastPsychHistory: string;
  familyHistory: string;
  substanceUse: string;
  riskSummary: string;
  diagnosis: string;
  notes: string;
  mse: Record<string, string>;
};

/* ── MSE options ── */
const MSE_OPTIONS: Record<string, string[]> = {
  appearance: ["Well Groomed", "Disheveled", "Poor Hygiene", "Unkempt"],
  psychomotor: ["Normal", "Agitated", "Retarded", "Restless"],
  behavior: ["Cooperative", "Withdrawn", "Hostile", "Guarded"],
  speechRate: ["Normal", "Pressured", "Slow", "Mute"],
  speechVolume: ["Normal", "Loud", "Soft"],
  mood: ["Euthymic", "Depressed", "Anxious", "Elevated"],
  moodSeverity: ["Mild", "Moderate", "Severe"],
  affect: ["Full", "Restricted", "Flat", "Labile"],
  thoughtProcess: ["Logical", "Circumstantial", "Tangential", "Disorganized"],
  perception: ["None", "Auditory Hallucinations", "Visual Hallucinations"],
  orientation: ["Oriented x3", "Disoriented"],
  attention: ["Intact", "Impaired"],
  memory: ["Intact", "Impaired"],
  insight: ["Good", "Fair", "Poor", "Absent"],
  judgment: ["Intact", "Impaired"],
};

/* ── Schema — defined outside component ── */
const schema = yup
  .object({
    occupation: yup.string().default(""),
    maritalStatus: yup.string().default(""),
    education: yup.string().default(""),
    referralSource: yup.string().default(""),
    presentingComplaint: yup.string().default(""),
    pastPsychHistory: yup.string().default(""),
    familyHistory: yup.string().default(""),
    substanceUse: yup.string().default(""),
    riskSummary: yup.string().default(""),
    diagnosis: yup.string().default(""),
    notes: yup.string().default(""),
    mse: yup.object().default({}),
  })
  .required();

function formatLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export default function InitialEvaluationForm({ patientId }: Props) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!patientId) return;
    api
      .get(`/patients/${patientId}`)
      .then((res) => setPatient(res.data))
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: schema.getDefault() as FormValues,
  });

  const selectedMood = useWatch({
    control,
    name: "mse.mood",
    defaultValue: "",
  });

  const fullName = useMemo(() => {
    if (!patient) return "—";
    return `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "—";
  }, [patient]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await api.post("/documents", {
        patientId,
        type: "initial-evaluation",
        content: data,
        createdAt: new Date(),
      });
      handlePrint();
    } catch {
      // toast handled by global error handler or add toast here
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Back */}
      <Link
        href={`/patients/${patientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition"
      >
        <ArrowLeft size={15} />
        Back to Patient
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Initial Evaluation
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">{fullName}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>

      <div className="space-y-4" ref={printRef}>
        {/* Patient info */}
        <SectionCard title="Patient Information">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem label="Name" value={fullName} />
            <InfoItem
              label="Age"
              value={`${calculateAge(patient?.dateOfBirth)}`}
            />
            <InfoItem label="Gender" value={patient?.gender || "—"} />
            <InfoItem label="Contact" value={patient?.phoneNo || "—"} />
          </div>
        </SectionCard>

        {/* Demographics */}
        <SectionCard title="Demographics">
          <FormGrid>
            <FormInput label="Occupation" {...register("occupation")} />
            <FormInput label="Marital Status" {...register("maritalStatus")} />
            <FormInput label="Education" {...register("education")} />
            <FormInput
              label="Referral Source"
              {...register("referralSource")}
            />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Presenting Complaints">
          <FormTextarea {...register("presentingComplaint")} rows={4} />
        </SectionCard>

        <SectionCard title="Past Psychiatric History">
          <FormTextarea {...register("pastPsychHistory")} rows={4} />
        </SectionCard>

        <SectionCard title="Family Psychiatric History">
          <FormTextarea {...register("familyHistory")} rows={4} />
        </SectionCard>

        <SectionCard title="Substance Use History">
          <FormTextarea {...register("substanceUse")} rows={4} />
        </SectionCard>

        {/* MSE */}
        <SectionCard title="Mental State Examination (MSE)">
          <FormGrid>
            {Object.entries(MSE_OPTIONS).map(([key, options]) => {
              if (key === "moodSeverity" && selectedMood !== "Depressed")
                return null;
              return (
                <FormSelect
                  key={key}
                  label={formatLabel(key)}
                  options={options}
                  {...register(`mse.${key}`)}
                />
              );
            })}
          </FormGrid>
        </SectionCard>

        <SectionCard title="Risk Summary & Clinical Impression">
          <div className="space-y-4">
            <FormTextarea
              label="Risk Summary"
              {...register("riskSummary")}
              rows={3}
            />
            <FormTextarea
              label="Diagnosis"
              {...register("diagnosis")}
              rows={3}
            />
          </div>
        </SectionCard>

        <SectionCard title="Additional Clinical Notes">
          <FormTextarea {...register("notes")} rows={4} />
        </SectionCard>
      </div>

      {/* Footer */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-50 shadow-sm"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Saving…" : "Save Document"}
        </button>
      </div>
    </div>
  );
}
