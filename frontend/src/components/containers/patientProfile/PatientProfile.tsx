"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  User,
  Calendar,
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
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { calculateAge, formatDate, capitalizeWords } from "@/lib/patientUtils";
import Prescription from "./patientTabs/Prescription";
import MedicalDocument from "./patientTabs/MedicalDocuments";
import AppointmentHistory from "./patientTabs/AppointmentHistory";

type Tab = "documents" | "prescriptions" | "appointments";

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

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "documents", label: "Documents", icon: ClipboardList },
  { id: "prescriptions", label: "Prescriptions", icon: Pill },
  { id: "appointments", label: "Appointments", icon: Calendar },
];

export default function PatientProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

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

  const shortId = patient?._id?.slice(-6) ?? "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <User size={36} className="text-text-disabled" />
        <p className="text-text-secondary text-sm">Patient not found</p>
        <Link href="/patients" className="text-primary text-sm hover:underline">
          Back to Patients
        </Link>
      </div>
    );
  }

  const medicalInfo = [
    {
      label: "Health Condition",
      value: patient.healthCondition || "Normal",
      icon: HeartPulse,
      colorClass: "bg-primary/10 text-primary",
    },
    {
      label: "Blood Group",
      value: patient.bloodGroup || "Not specified",
      icon: Droplet,
      colorClass: "bg-danger/10 text-danger",
    },
    {
      label: "Allergies",
      value: patient.allergies || "None reported",
      icon: AlertTriangle,
      colorClass: "bg-warning/10 text-warning",
    },
    {
      label: "Emergency Contact",
      value: patient.emergency_contact_name || "Not provided",
      sub: patient.emergency_contact_phone,
      icon: ShieldPlus,
      colorClass: "bg-purple-500/10 text-purple-500",
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/patients"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition"
      >
        <ArrowLeft size={15} />
        Back to Patients
      </Link>

      {/* Profile header card */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        {/* Cover */}
        <div className="h-20 bg-gradient-to-r from-primary/15 to-primary/5" />

        <div className="px-4 md:px-6 pb-5 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl border-4 border-bg-card bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shadow-sm shrink-0 overflow-hidden">
                {patient.avatar ? (
                  <img
                    src={patient.avatar}
                    alt={fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  fullName.charAt(0).toUpperCase() || "P"
                )}
              </div>

              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-text-primary">
                    {fullName || "Unnamed Patient"}
                  </h1>
                  <span className="text-xs text-text-disabled font-mono">
                    #{shortId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${patient.isActive !== false ? "bg-success/10 text-success" : "bg-border text-text-secondary"}`}
                  >
                    {patient.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Detail chips */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {[
                    { icon: User, value: patient.gender || "—" },
                    {
                      icon: Calendar,
                      value: `${calculateAge(patient.dateOfBirth)}`,
                    },
                    { icon: Phone, value: patient.phoneNo || "—" },
                    { icon: Mail, value: patient.email || "—" },
                    {
                      icon: Calendar,
                      value: `Last visit: ${formatDate(patient.lastVisit)}`,
                    },
                  ].map(({ icon: Icon, value }, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs text-text-secondary"
                    >
                      <Icon size={12} className="opacity-60 shrink-0" />
                      <span className="truncate max-w-[160px]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:pb-1">
              <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition">
                <Pencil size={14} />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Medical info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {medicalInfo.map(({ label, value, sub, icon: Icon, colorClass }) => (
          <div
            key={label}
            className="bg-bg-card border border-border rounded-2xl p-4 flex items-start gap-3"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 truncate">
                {value}
              </p>
              {sub && <p className="text-xs text-text-secondary">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map(({ id: tabId, label, icon: Icon }) => {
            const active = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition border-b-2 ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {activeTab === "documents" && <MedicalDocument patientId={id} />}
          {activeTab === "prescriptions" && <Prescription />}
          {activeTab === "appointments" && <AppointmentHistory />}
        </div>
      </div>
    </div>
  );
}
