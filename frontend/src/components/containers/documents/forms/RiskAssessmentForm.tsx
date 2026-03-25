"use client";

import { useState } from "react";
import { useForm, useWatch, Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  SectionCard,
  FormSelect,
  FormTextarea,
} from "@/components/containers/documents/forms/FormFields";

type Props = { patientId: string };

type FormValues = {
  suicidalIdeation: string;
  selfHarmHistory: string;
  intent: string;
  plan: string;
  accessToMeans: string;
  protectiveFactors: string;
  riskLevel: string;
  actionPlan: string;
};

/* ── Schema — defined outside component ── */
const schema = yup
  .object({
    suicidalIdeation: yup.string().required("Required"),
    selfHarmHistory: yup.string().default(""),
    intent: yup.string().when("suicidalIdeation", {
      is: "Active",
      then: (s) => s.required("Required"),
      otherwise: (s) => s,
    }),
    plan: yup.string().when("suicidalIdeation", {
      is: "Active",
      then: (s) => s.required("Required"),
      otherwise: (s) => s,
    }),
    accessToMeans: yup.string().when("suicidalIdeation", {
      is: "Active",
      then: (s) => s.required("Required"),
      otherwise: (s) => s,
    }),
    protectiveFactors: yup.string().default(""),
    riskLevel: yup.string().required("Required"),
    actionPlan: yup.string().default(""),
  })
  .required();

export default function RiskAssessmentForm({ patientId }: Props) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      suicidalIdeation: "",
      selfHarmHistory: "",
      intent: "",
      plan: "",
      accessToMeans: "",
      protectiveFactors: "",
      riskLevel: "",
      actionPlan: "",
    },
  });

  const suicidalIdeation = useWatch({ control, name: "suicidalIdeation" });

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await api.post("/documents", {
        patientId,
        type: "risk-assessment",
        content: data,
        createdAt: new Date(),
      });
    } catch {
      // handle via global toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back */}
      <Link
        href={`/patients/${patientId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition"
      >
        <ArrowLeft size={15} />
        Back to Patient
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Risk Assessment
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Suicide & self-harm risk evaluation
        </p>
      </div>

      <SectionCard title="Suicide & Self-Harm Risk Assessment">
        <FormSelect
          label="Suicidal Ideation"
          options={["None", "Passive", "Active"]}
          error={errors.suicidalIdeation}
          {...register("suicidalIdeation")}
        />

        {suicidalIdeation === "Active" && (
          <>
            <FormSelect
              label="Intent"
              options={["No Intent", "Uncertain", "Clear Intent"]}
              error={errors.intent}
              {...register("intent")}
            />
            <FormSelect
              label="Plan"
              options={["No Plan", "Vague Plan", "Specific Plan"]}
              error={errors.plan}
              {...register("plan")}
            />
            <FormSelect
              label="Access to Means"
              options={["No Access", "Limited Access", "Has Access"]}
              error={errors.accessToMeans}
              {...register("accessToMeans")}
            />
          </>
        )}

        <FormSelect
          label="History of Self Harm"
          options={["None", "Past History", "Recent Incident"]}
          {...register("selfHarmHistory")}
        />

        <FormTextarea
          label="Protective Factors"
          {...register("protectiveFactors")}
        />

        <FormSelect
          label="Overall Risk Level"
          options={["Low", "Moderate", "High", "Imminent"]}
          error={errors.riskLevel}
          {...register("riskLevel")}
        />

        <FormTextarea
          label="Immediate Action Plan"
          {...register("actionPlan")}
        />
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition disabled:opacity-50 shadow-sm"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Saving…" : "Save Risk Assessment"}
        </button>
      </div>
    </div>
  );
}
