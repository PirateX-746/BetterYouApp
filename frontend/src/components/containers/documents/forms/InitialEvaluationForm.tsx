"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import GoBackButton from "@/components/common/goBackButton/GoBackButton";

/* ================= TYPES ================= */

type Props = {
    patientId: string;
};

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

/* ================= MSE OPTIONS ================= */

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

/* ================= COMPONENT ================= */

export default function InitialEvaluationForm({ patientId }: Props) {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!patientId) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${patientId}`)
            .then((res) => res.json())
            .then(setPatient)
            .catch(() => setPatient(null))
            .finally(() => setLoading(false));
    }, [patientId]);

    const {
        register,
        handleSubmit,
        watch,
    } = useForm<FormValues>({
        defaultValues: {
            occupation: "",
            maritalStatus: "",
            education: "",
            referralSource: "",

            presentingComplaint: "",
            pastPsychHistory: "",
            familyHistory: "",
            substanceUse: "",

            riskSummary: "",
            diagnosis: "",

            notes: "",
            mse: {},
        },
    });

    const selectedMood = watch("mse.mood");
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!printRef.current) return;

        const printContents = printRef.current.innerHTML;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;

        // Prevent hydration mismatch
        window.location.reload();
    };

    const onSubmit = (data: FormValues) => {
        console.log({
            patientId,
            type: "initial-evaluation",
            content: data,
            createdAt: new Date(),
        });

        handlePrint();
    };




    if (loading) return <div className="p-10">Loading patient...</div>;

    return (
        <>
            <GoBackButton
                fallbackPath={`${process.env.NEXT_PUBLIC_API_URL}/patients/${patientId}`}
                label="Back to Patient"
            />

            <div className="max-w-5xl space-y-8" ref={printRef}>

                {/* Patient Info */}
                <SectionCard title="Patient Information">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <InfoItem label="Name" value={fullName(patient)} />
                        <InfoItem label="Age" value={`${calculateAge(patient?.dateOfBirth)} years`} />
                        <InfoItem label="Gender" value={patient?.gender || "—"} />
                        <InfoItem label="Contact" value={patient?.phoneNo || "—"} />
                    </div>
                </SectionCard>

                {/* Demographics */}
                <SectionCard title="Demographics">
                    <Grid>
                        <Input label="Occupation" {...register("occupation")} />
                        <Input label="Marital Status" {...register("maritalStatus")} />
                        <Input label="Education" {...register("education")} />
                        <Input label="Referral Source" {...register("referralSource")} />
                    </Grid>
                </SectionCard>

                {/* Presenting Complaint */}
                <SectionCard title="Presenting Complaints">
                    <Textarea {...register("presentingComplaint")} />
                </SectionCard>

                {/* Past Psychiatric History */}
                <SectionCard title="Past Psychiatric History">
                    <Textarea {...register("pastPsychHistory")} />
                </SectionCard>

                {/* Family History */}
                <SectionCard title="Family Psychiatric History">
                    <Textarea {...register("familyHistory")} />
                </SectionCard>

                {/* Substance Use */}
                <SectionCard title="Substance Use History">
                    <Textarea {...register("substanceUse")} />
                </SectionCard>

                {/* MSE */}
                <SectionCard title="Mental State Examination (MSE)">
                    <Grid>
                        {Object.entries(MSE_OPTIONS).map(([key, options]) => {
                            if (key === "moodSeverity" && selectedMood !== "Depressed") {
                                return null;
                            }

                            return (
                                <Select
                                    key={key}
                                    label={formatLabel(key)}
                                    options={options}
                                    {...register(`mse.${key}`)}
                                />
                            );
                        })}
                    </Grid>
                </SectionCard>

                {/* Risk Summary */}
                <SectionCard title="Risk Summary & Clinical Impression">
                    <Textarea {...register("riskSummary")} />
                    <Textarea {...register("diagnosis")} />
                </SectionCard>

                {/* Clinical Notes */}
                <SectionCard title="Additional Clinical Notes">
                    <Textarea {...register("notes")} />
                </SectionCard>

                {/* Save */}
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
                        Save Document
                    </button>
                </div>

            </div>
        </>
    );
}

/* ================= UI COMPONENTS ================= */

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
            <h2 className="text-lg font-semibold">{title}</h2>
            {children}
        </div>
    );
}

function Grid({ children }: any) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>;
}

function Input({ label, ...props }: any) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <input {...props} className="w-full px-4 py-2 text-sm" style={fieldStyle} />
        </div>
    );
}

function Select({ label, options, ...props }: any) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <select {...props} className="w-full px-4 py-2 text-sm" style={fieldStyle}>
                <option value="">Select</option>
                {options.map((opt: string) => (
                    <option key={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}

function Textarea(props: any) {
    return (
        <textarea
            {...props}
            rows={3}
            className="w-full px-4 py-3 text-sm resize-none"
            style={fieldStyle}
        />
    );
}

function InfoItem({ label, value }: any) {
    return (
        <div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {label}
            </div>
            <div className="text-sm font-medium">{value}</div>
        </div>
    );
}

/* ================= HELPERS ================= */

function fullName(patient: Patient | null) {
    if (!patient) return "—";
    return `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "—";
}

function calculateAge(dob?: string) {
    if (!dob) return "—";
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()))
        age--;
    return age;
}

function formatLabel(key: string) {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
}

const fieldStyle = {
    border: "1px solid var(--border-light)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-light)",
};
