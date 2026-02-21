"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import styles from "./PatientProfile.module.css";
import Prescription from "./patientTabs/Prescription";
import MedicalDocument from "./patientTabs/MedicalDocuments";
import GoBackButton from "../../common/goBackButton/GoBackButton";
import {
    ArrowLeft,
    Calendar,
    User,
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
} from "lucide-react";
import AppointmentHistory from "./patientTabs/AppointmentHistory";

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
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    isActive?: boolean;
};

export default function PatientProfilePage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"documents" | "prescriptions" | "appointments">("documents");
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    console.log(id);

    /* ===============================
       FETCH PATIENT
    =============================== */
    useEffect(() => {
        if (!id) return;

        const fetchPatient = async () => {
            try {
                const res = await fetch(`/api/patients/${id}`);
                if (!res.ok) throw new Error("Patient not found");

                const data = await res.json();
                setPatient(data);
            } catch (err) {
                console.error(err);
                setPatient(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPatient();
    }, [id]);

    /* ===============================
       DERIVED VALUES
    =============================== */

    const capitalizeWords = (text: string) => {
        return text
            .toLowerCase()
            .split(" ")
            .map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join(" ");
    };
    const fullName = useMemo(() => {
        if (!patient) return "";
        return `${capitalizeWords(patient.firstName ?? "")} ${capitalizeWords(patient.lastName ?? "")}`.trim();
    }, [patient]);

    const calculateAge = (dob?: string) => {
        if (!dob) return "—";

        const birthDate = new Date(dob);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }

        return age;
    };

    const formattedLastVisit = patient?.lastVisit
        ? new Date(patient.lastVisit).toLocaleDateString()
        : "No visits";

    const statusClass = patient?.isActive
        ? styles.statusActive
        : styles.statusInactive;

    const shortId =
        typeof patient?._id === "string"
            ? patient._id.slice(-6)
            : "—";

    /* ===============================
       LOADING
    =============================== */
    if (loading) {
        return (
            <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
                <p>Loading patient profile...</p>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className={styles.emptyState}>
                <h3>Patient not found</h3>
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case "documents":
                return <MedicalDocument patientId={id} />;
            case "prescriptions":
                return <Prescription />;
            case "appointments":
                return <AppointmentHistory patientId={id} />;
            default:
                return null;
        }
    };

    return (
        <div className={styles.patientContainer}>
            {/* Back Button */}
            <GoBackButton
                fallbackPath="/patients"
                label="Back to Patients"
            />
            {/* Profile Header */}
            <div className={styles.profileHeaderCard}>
                {/* Avatar + Status */}
                <div className={styles.profileAvatarSection}>
                    <div className={styles.profileAvatarLg}>
                        {patient?.avatar ? (
                            <img
                                src={patient.avatar}
                                alt={fullName}
                                className={styles.profileAvatarImage}
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                {fullName?.charAt(0).toUpperCase() || "P"}
                            </div>
                        )}
                    </div>


                    <div className={`${styles.statusBadge} ${statusClass}`}>
                        <span className={styles.statusDot}></span>
                        {patient.isActive ? "Active" : "Inactive"}
                    </div>
                </div>

                {/* Patient Info */}
                <div className={styles.profileHeaderInfo}>
                    <h1 className={styles.profileName}>
                        {fullName || "Unnamed Patient"}
                    </h1>

                    <span className={styles.patientId}>
                        #{shortId}
                    </span>

                    <div className={styles.profileDetailsRow}>
                        <div className={styles.detailChip}>
                            <User size={16} />
                            {patient.gender || "Not specified"}
                        </div>

                        <div className={styles.detailChip}>
                            <Calendar size={16} />
                            {calculateAge(patient.dateOfBirth)} years
                        </div>

                        <div className={styles.detailChip}>
                            <Phone size={16} />
                            {patient.phoneNo || "No phone"}
                        </div>

                        <div className={styles.detailChip}>
                            <Mail size={16} />
                            {patient.email || "No email"}
                        </div>

                        <div className={styles.detailChip}>
                            <Calendar size={16} />
                            {formattedLastVisit}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.profileActions}>
                    <button className={styles.editButton}>
                        <Pencil size={16} />
                        Edit Profile
                    </button>

                    <button
                        onClick={() => window.print()}
                        className={styles.printButton}
                    >
                        <Printer size={16} />
                        Print
                    </button>
                </div>
            </div>

            {/* Medical Info Cards */}
            <div className={styles.infoCardsGrid}>
                <div className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ background: "#DBEAFE", color: "#1E40AF" }}>
                        <HeartPulse size={22} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>Health Condition</div>
                        <div className={styles.infoValue}>
                            {patient.healthCondition || "Normal"}
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ background: "#FEE2E2", color: "#991B1B" }}>
                        <Droplet size={22} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>Blood Group</div>
                        <div className={styles.infoValue}>
                            {patient.bloodGroup || "Not specified"}
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ background: "#FED7AA", color: "#9A3412" }}>
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>Allergies</div>
                        <div className={styles.infoValue}>
                            {patient.allergies || "None reported"}
                        </div>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ background: "#F3E8FF", color: "#7C3AED" }}>
                        <ShieldPlus size={22} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>Emergency Contact</div>
                        <div className={styles.infoValue}>
                            {patient.emergency_contact_name || "Not provided"}
                            {patient.emergency_contact_phone && (
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    {patient.emergency_contact_phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.profileTabs}>
                <button
                    onClick={() => setActiveTab("documents")}
                    className={`${styles.tabBtn} ${activeTab === "documents" ? styles.active : ""
                        }`}
                >
                    <ClipboardList size={16} />
                    Medical Documents
                </button>

                <button
                    onClick={() => setActiveTab("prescriptions")}
                    className={`${styles.tabBtn} ${activeTab === "prescriptions" ? styles.active : ""
                        }`}
                >
                    <Pill size={16} />
                    Prescriptions
                </button>

                <button
                    onClick={() => setActiveTab("appointments")}
                    className={`${styles.tabBtn} ${activeTab === "appointments" ? styles.active : ""
                        }`}
                >
                    <Calendar size={16} />
                    Appointments
                </button>
            </div>


            {/* Tab Content */}
            <div className={styles.tabContentArea}>
                {renderTabContent()}
            </div>

        </div>
    );
}
