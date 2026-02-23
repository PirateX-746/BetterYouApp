"use client";

import { useEffect, useMemo, useState } from "react";
import PatientStyle from "./PatientProfile.module.css";
import ViewButton from "../../patients/ViewButton";
import EditButton from "../../patients/EditButton";
import DeleteButton from "../../patients/DeleteButton";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { api } from "@/lib/api";

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

export default function AppointmentHistory(patientId: string) {
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
        <div className={PatientStyle.patientsContainer}>
            <div className={PatientStyle.pageHeaderActions}>
                <div className={PatientStyle.pageHeaderLeft}>
                    <h1 className="text-2xl font-semibold text-text-primary">
                        Patients
                    </h1>
                    <p className="text-text-secondary py-1">
                        Manage your patient records
                    </p>
                </div>

                <div className={`${PatientStyle.pageHeaderRight} p-6`}>
                    <input
                        type="text"
                        className={`${PatientStyle.searchInput} p-2`}
                        placeholder="Search patients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button
                        className={PatientStyle.addPatientBtn}
                        onClick={() => setOpen(true)}
                    >
                        + Add Patient
                    </button>
                </div>
            </div>

            <div style={{ position: "relative" }}>
                <div className={PatientStyle.scrollIndicator}>
                    ← Scroll to see more →
                </div>

                <div className={PatientStyle.tableWrapper}>
                    <table className={PatientStyle.dataTable}>
                        <thead>
                            <tr>
                                <th>Patient Name</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Last Visit</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">👥</div>
                                            <div className="empty-state-title">
                                                No Patients Found
                                            </div>
                                            <div className="empty-state-description">
                                                Start by adding your first patient
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((p) => (
                                    <tr key={p._id}>
                                        <td>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                }}
                                            >
                                                {p.avatar ? (
                                                    <img
                                                        src={p.avatar}
                                                        alt={p.displayName}
                                                        className={PatientStyle.tableAvatar}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className={
                                                            PatientStyle.tableAvatarFallback
                                                        }
                                                    >
                                                        <User size={18} strokeWidth={2} />
                                                    </div>
                                                )}

                                                <span>{p.displayName}</span>
                                            </div>
                                        </td>

                                        <td>{calculateAge(p.dateOfBirth)}</td>

                                        <td>
                                            {p.gender ? (
                                                <span
                                                    className={`${PatientStyle.badge} ${p.gender.toLowerCase() === "male"
                                                        ? PatientStyle.badgeBlue
                                                        : PatientStyle.badgePurple
                                                        }`}
                                                >
                                                    {p.gender.charAt(0).toUpperCase() +
                                                        p.gender.slice(1)}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>

                                        <td>{p.phoneNo ?? "—"}</td>
                                        <td>{p.email ?? "—"}</td>
                                        <td>{formatDate(p.lastVisit)}</td>

                                        <td>
                                            <span
                                                className={`${PatientStyle.badge} ${PatientStyle.badgeGreen}`}
                                            >
                                                Active
                                            </span>
                                        </td>

                                        <td>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <ViewButton
                                                    onClick={() =>
                                                        router.push(`/patients/${p._id}`)
                                                    }
                                                />
                                                <EditButton onClick={() => { }} />
                                                <DeleteButton onClick={() => { }} />
                                            </div>
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