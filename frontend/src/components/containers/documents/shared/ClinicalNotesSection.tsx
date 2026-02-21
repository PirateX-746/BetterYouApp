"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";

type Props = {
    register: UseFormRegister<any>;
    errors?: FieldErrors<any>;
};

export default function ClinicalNotesSection({
    register,
    errors,
}: Props) {
    return (
        <SectionCard title="Additional Clinical Notes">
            <FormField
                label="Practitioner Notes"
                error={errors?.notes?.message as string | undefined}
            >
                <textarea
                    {...register("notes")}
                    rows={5}
                    placeholder="Add clinical observations, contextual details, patient statements, or professional impressions..."
                    className="w-full px-4 py-3 text-sm resize-none transition-all"
                    style={{
                        background: "var(--bg-light)",
                        border: errors?.notes
                            ? "1px solid var(--rose)"
                            : "1px solid var(--border-light)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        outline: "none",
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.border =
                            "1px solid var(--primary)";
                        e.currentTarget.style.boxShadow =
                            "0 0 0 2px var(--primary-light)";
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.border = errors?.notes
                            ? "1px solid var(--rose)"
                            : "1px solid var(--border-light)";
                        e.currentTarget.style.boxShadow = "none";
                    }}
                />
            </FormField>
        </SectionCard>
    );
}

/* ===============================
   SECTION CARD
=============================== */

function SectionCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="p-6 space-y-6"
            style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-light)",
                boxShadow: "var(--shadow-sm)",
            }}
        >
            <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
            >
                {title}
            </h2>
            {children}
        </div>
    );
}

/* ===============================
   FORM FIELD WRAPPER
=============================== */

function FormField({
    label,
    children,
    error,
}: {
    label: string;
    children: React.ReactNode;
    error?: string;
}) {
    return (
        <div className="space-y-2">
            <label
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
            >
                {label}
            </label>

            {children}

            {error && (
                <p
                    className="text-xs"
                    style={{ color: "var(--rose)" }}
                >
                    {error}
                </p>
            )}
        </div>
    );
}
