"use client";

import { useState, useRef } from "react";
import { Camera, Edit3, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import Image from "next/image";
import toast from "react-hot-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProfile } from "@/hooks/useProfile";

const TABS = ["overview", "appointments", "prescriptions"] as const;
type Tab = (typeof TABS)[number];

export default function PatientProfile() {
  const userId = useLocalStorage("userId");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [avatarPreview, setAvatarPreview] = useState(
    "https://randomuser.me/api/portraits/med/men/1.jpg",
  );

  const { patient, draft, setDraft, setPatient, loading } = useProfile(userId);

  const handleChange = (field: keyof typeof draft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await api.patch(`/patients/${userId}`, draft);
      setPatient(draft);
      setEditMode(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      void handleSave();
    } else {
      setDraft(patient);
      setEditMode(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Header Card */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-4">
        {/* Cover strip */}
        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5" />

        <div className="px-4 pb-4 -mt-10">
          <div className="flex items-end justify-between mb-4">
            {/* Avatar */}
            <div
              onClick={
                editMode ? () => fileInputRef.current?.click() : undefined
              }
              className={`relative ${editMode ? "cursor-pointer" : ""}`}
            >
              <Image
                src={avatarPreview}
                alt={`${patient.firstName} ${patient.lastName}`}
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 rounded-2xl object-cover border-4 border-bg-card shadow-sm"
              />
              {editMode && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <Camera size={18} className="text-white" />
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Edit / Save button */}
            <button
              onClick={handleEditToggle}
              disabled={saving}
              className="flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-xl hover:bg-bg-hover transition text-text-primary disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : editMode ? (
                <Save size={15} />
              ) : (
                <Edit3 size={15} />
              )}
              {saving ? "Saving…" : editMode ? "Save" : "Edit"}
            </button>
          </div>

          {/* Name */}
          {editMode ? (
            <div className="flex gap-2 mb-1">
              <input
                value={draft.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="First name"
                className="border-b border-border text-lg font-semibold outline-none bg-transparent w-1/2 pb-1 text-text-primary"
              />
              <input
                value={draft.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Last name"
                className="border-b border-border text-lg font-semibold outline-none bg-transparent w-1/2 pb-1 text-text-primary"
              />
            </div>
          ) : (
            <h1 className="text-xl font-semibold text-text-primary">
              {patient.firstName} {patient.lastName}
            </h1>
          )}

          {patient.lastVisit && (
            <p className="text-xs text-text-secondary mt-1">
              Last visit · {patient.lastVisit}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4 bg-bg-card rounded-t-xl overflow-hidden">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm capitalize transition font-medium ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === "overview" && (
          <>
            {(
              [
                { label: "Email", field: "email" },
                { label: "Phone", field: "phoneNo" },
                { label: "Blood Group", field: "bloodGroup" },
                { label: "Allergies", field: "allergies" },
                { label: "Health Condition", field: "healthCondition" },
              ] as { label: string; field: keyof typeof draft }[]
            ).map(({ label, field }) => (
              <EditableField
                key={field}
                label={label}
                value={editMode ? draft[field] : patient[field]}
                editMode={editMode}
                onChange={(v) => handleChange(field, v)}
              />
            ))}
          </>
        )}

        {activeTab === "appointments" && <Timeline />}

        {activeTab === "prescriptions" && (
          <div className="bg-bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-text-secondary text-sm">
              No prescriptions available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function EditableField({
  label,
  value,
  editMode,
  onChange,
}: {
  label: string;
  value: string;
  editMode: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-xs text-text-secondary w-28 shrink-0">{label}</p>
      {editMode ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-border pb-0.5 text-text-primary min-w-0"
        />
      ) : (
        <p className="flex-1 text-sm font-medium text-text-primary text-right truncate">
          {value || (
            <span className="text-text-secondary italic font-normal">
              Not set
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function Timeline() {
  const visits = [
    { date: "Feb 12, 2026", note: "Routine Checkup" },
    { date: "Nov 2, 2025", note: "Blood Test" },
    { date: "Jun 18, 2025", note: "Initial Consultation" },
  ];

  return (
    <div className="bg-bg-card border border-border rounded-2xl divide-y divide-border">
      {visits.map((visit, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">
              {visit.note}
            </p>
            <p className="text-xs text-text-secondary">{visit.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
