"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { Patient } from "@/types/patient";

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: (patient: Patient) => void;
};

const INITIAL = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNo: "",
    dateOfBirth: "",
    gender: "" as "" | "male" | "female" | "other",
    bloodGroup: "",
    allergies: "",
};

export default function AddPatientModal({ open, onClose, onCreated }: Props) {
    const [form, setForm] = useState(INITIAL);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    if (!open) return null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError("First name and last name are required.");
            return;
        }
        if (!form.email.trim()) {
            setError("Email is required.");
            return;
        }

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
            setForm(INITIAL);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create patient.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-lg mx-4 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl shadow-lg overflow-hidden animate-fadeInLeft"
                style={{ animationDuration: "0.25s" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Add New Patient
                        </h2>
                        <p className="text-xs text-[var(--text-light)] mt-0.5">
                            Fill in the details below
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-light)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                        {error && (
                            <div className="text-sm text-[var(--danger)] bg-[var(--rose-light)] px-3 py-2 rounded-md">
                                {error}
                            </div>
                        )}

                        {/* Name Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                    First Name <span className="text-[var(--danger)]">*</span>
                                </label>
                                <input
                                    name="firstName"
                                    value={form.firstName}
                                    onChange={handleChange}
                                    placeholder="John"
                                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                    Last Name <span className="text-[var(--danger)]">*</span>
                                </label>
                                <input
                                    name="lastName"
                                    value={form.lastName}
                                    onChange={handleChange}
                                    placeholder="Doe"
                                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                Email <span className="text-[var(--danger)]">*</span>
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="patient@example.com"
                                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition"
                            />
                        </div>

                        {/* Phone + DOB */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                    Phone
                                </label>
                                <input
                                    name="phoneNo"
                                    type="tel"
                                    value={form.phoneNo}
                                    onChange={handleChange}
                                    placeholder="+91 00000 00000"
                                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                    Date of Birth
                                </label>
                                <input
                                    name="dateOfBirth"
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Gender + Blood Group */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                    Gender
                                </label>
                                <select
                                    name="gender"
                                    value={form.gender}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition"
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                    Blood Group
                                </label>
                                <input
                                    name="bloodGroup"
                                    value={form.bloodGroup}
                                    onChange={handleChange}
                                    placeholder="e.g. O+"
                                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Allergies */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                                Allergies
                            </label>
                            <textarea
                                name="allergies"
                                value={form.allergies}
                                onChange={handleChange}
                                placeholder="Known allergies (optional)"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-page)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)] outline-none transition resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-page)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {saving ? "Saving…" : "Add Patient"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
