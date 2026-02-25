"use client";

import { useEffect, useMemo, useState } from "react";
import ViewButton from "@/components/containers/patients/ViewButton";
import EditButton from "@/components/containers/patients/EditButton";
import DeleteButton from "@/components/containers/patients/DeleteButton";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User } from "lucide-react";

/* ========================================
  TYPES
======================================== */

type Patient = {
    _id: string;
    avatar?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    age?: number;
    dateOfBirth?: string;
    gender?: "male" | "female" | "other";
    phoneNo?: string;
    email?: string;
    lastVisit?: string;
};

type PatientView = Patient & {
    displayName: string;
};

/* ========================================
  UTILS
======================================== */

function getDisplayName(p: Patient) {
    const raw =
        p.name ||
        `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ||
        "Unknown";

    return raw
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
}

function formatDate(date?: string) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
}

/* ========================================
  COMPONENT
======================================== */

export default function AppointmentHistory({ patientId }: { patientId: string }) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    /* Fetch patients */
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await api.get("/patients", {
                    params: {
                        patientId,
                    },
                });

                const data = res.data;

                setPatients(
                    Array.isArray(data) ? data : data?.patients ?? []
                );
            } catch (err: any) {
                console.error(
                    "API Error:",
                    err.response?.status,
                    err.response?.data
                );
                setPatients([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, []);

    const filteredPatients: PatientView[] = useMemo(() => {
        return patients
            .map((p) => ({ ...p, displayName: getDisplayName(p) }))
            .filter((p) =>
                p.displayName.toLowerCase().includes(search.toLowerCase())
            );
    }, [patients, search]);

    function calculateAge(dateOfBirth?: string): string {
        if (!dateOfBirth) return "—";

        const birthDate = new Date(dateOfBirth);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }

        return `${age} years`;
    }

    if (loading) {
        return (
            <p className="text-sm text-text-secondary">
                Loading patients…
            </p>
        );
    }

    return (
        <div className="space-y-6 animate-fadeInLeft">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-text-primary">
                        Patients
                    </h1>
                    <p className="text-text-secondary py-1">
                        Manage your patient records
                    </p>
                </div>

                <div className="flex gap-4 p-6">
                    <input
                        type="text"
                        className="input-style p-2"
                        placeholder="Search patients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button
                        className="btn btn-primary whitespace-nowrap"
                        onClick={() => setOpen(true)}
                    >
                        + Add Patient
                    </button>
                </div>
            </div>

            <div className="relative">
                <div className="text-xs text-text-secondary mb-2 block md:hidden">
                    ← Scroll to see more →
                </div>

                <div className="overflow-x-auto bg-bg-card border border-border rounded-xl shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-bg-light border-b border-border text-text-secondary font-medium">
                            <tr>
                                <th className="px-6 py-4">Patient Name</th>
                                <th className="px-6 py-4">Age</th>
                                <th className="px-6 py-4">Gender</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Last Visit</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-text-secondary">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="text-4xl mb-2">👥</div>
                                            <div className="text-lg font-medium text-text-primary">
                                                No Patients Found
                                            </div>
                                            <div className="text-sm">
                                                Start by adding your first patient
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((p) => (
                                    <tr key={p._id} className="hover:bg-bg-hover transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {p.avatar ? (
                                                    <img
                                                        src={p.avatar}
                                                        alt={p.displayName}
                                                        className="w-10 h-10 rounded-full object-cover border border-border"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center">
                                                        <User size={18} strokeWidth={2} />
                                                    </div>
                                                )}

                                                <span className="font-medium text-text-primary">{p.displayName}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">{calculateAge(p.dateOfBirth)}</td>

                                        <td className="px-6 py-4">
                                            {p.gender ? (
                                                <span
                                                    className={`badge ${p.gender.toLowerCase() === "male"
                                                        ? 'badge-primary'
                                                        : 'badge-warning'
                                                        }`}
                                                >
                                                    {p.gender.charAt(0).toUpperCase() +
                                                        p.gender.slice(1)}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>

                                        <td className="px-6 py-4">{p.phoneNo ?? "—"}</td>
                                        <td className="px-6 py-4">{p.email ?? "—"}</td>
                                        <td className="px-6 py-4">{formatDate(p.lastVisit)}</td>

                                        <td className="px-6 py-4">
                                            <span className="badge badge-success">
                                                Active
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 flex gap-2">
                                            <ViewButton
                                                onClick={() =>
                                                    router.push(`/patients/${p._id}`)
                                                }
                                            />
                                            <EditButton onClick={() => { }} />
                                            <DeleteButton onClick={() => { }} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}