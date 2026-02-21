"use client";

import GoBackButton from "@/components/common/goBackButton/GoBackButton";
import { useForm, useWatch } from "react-hook-form";

type Props = {
    patientId: string;
};

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

export default function RiskAssessmentForm({ patientId }: Props) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<FormValues>({
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

    const suicidalIdeation = useWatch({
        control,
        name: "suicidalIdeation",
    });

    const onSubmit = (data: FormValues) => {
        const payload = {
            patientId,
            type: "risk-assessment",
            content: data,
            createdAt: new Date(),
        };

        console.log(payload);
    };

    return (
        <>
            <GoBackButton
                fallbackPath="/documents"
                label="Back to Patient" />
            <div className="max-w-5xl space-y-8">

                <SectionCard title="Suicide & Self-Harm Risk Assessment">

                    <Select
                        label="Suicidal Ideation"
                        {...register("suicidalIdeation", { required: "Required" })}
                        options={["None", "Passive", "Active"]}
                        error={errors.suicidalIdeation}
                    />

                    {suicidalIdeation === "Active" && (
                        <>
                            <Select
                                label="Intent"
                                {...register("intent", { required: "Required" })}
                                options={["No Intent", "Uncertain", "Clear Intent"]}
                                error={errors.intent}
                            />

                            <Select
                                label="Plan"
                                {...register("plan", { required: "Required" })}
                                options={["No Plan", "Vague Plan", "Specific Plan"]}
                                error={errors.plan}
                            />

                            <Select
                                label="Access to Means"
                                {...register("accessToMeans", { required: "Required" })}
                                options={["No Access", "Limited Access", "Has Access"]}
                                error={errors.accessToMeans}
                            />
                        </>
                    )}

                    <Select
                        label="History of Self Harm"
                        {...register("selfHarmHistory")}
                        options={["None", "Past History", "Recent Incident"]}
                    />

                    <Textarea
                        label="Protective Factors"
                        {...register("protectiveFactors")}
                    />

                    <Select
                        label="Overall Risk Level"
                        {...register("riskLevel", { required: "Required" })}
                        options={["Low", "Moderate", "High", "Imminent"]}
                        error={errors.riskLevel}
                    />

                    <Textarea
                        label="Immediate Action Plan"
                        {...register("actionPlan")}
                    />

                </SectionCard>

                <div className="flex justify-end">
                    <button
                        onClick={handleSubmit(onSubmit)}
                        className="px-6 py-3 text-sm font-medium"
                        style={{
                            background: "var(--primary)",
                            color: "white",
                            borderRadius: "var(--radius-md)",
                        }}
                    >
                        Save Risk Assessment
                    </button>
                </div>

            </div>
        </>
    );
}

/* ===================== UI COMPONENTS ===================== */

function SectionCard({ title, children }: any) {
    return (
        <div
            className="p-6 space-y-6"
            style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-light)",
            }}
        >
            <h2 className="text-lg font-semibold">
                {title}
            </h2>
            {children}
        </div>
    );
}

function Select({ label, options, error, ...props }: any) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">
                {label}
            </label>

            <select
                {...props}
                className="w-full px-4 py-2 text-sm"
                style={{
                    border: error
                        ? "1px solid var(--rose)"
                        : "1px solid var(--border-light)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-light)",
                }}
            >
                <option value="">Select</option>
                {options.map((opt: string) => (
                    <option key={opt}>{opt}</option>
                ))}
            </select>

            {error && (
                <p className="text-xs" style={{ color: "var(--rose)" }}>
                    {error.message}
                </p>
            )}
        </div>
    );
}

function Textarea({ label, ...props }: any) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">
                {label}
            </label>

            <textarea
                {...props}
                rows={3}
                className="w-full px-4 py-2 text-sm"
                style={{
                    border: "1px solid var(--border-light)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-light)",
                }}
            />
        </div>
    );
}
