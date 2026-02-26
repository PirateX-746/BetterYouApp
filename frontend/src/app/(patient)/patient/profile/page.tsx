"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Edit3, Save } from "lucide-react";

export default function PatientProfile() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [avatarPreview, setAvatarPreview] = useState(
    "https://randomuser.me/api/portraits/men/1.jpg"
  );

  const [patient, setPatient] = useState({
    firstName: "Keyur",
    lastName: "Thakkar",
    email: "keyur@thakkar.com",
    phoneNo: "9876543210",
    bloodGroup: "O+",
    allergies: "None",
    healthCondition: "Healthy",
    lastVisit: "2026-02-12",
  });

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const handleChange = (field: string, value: string) => {
    setPatient({ ...patient, [field]: value });
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // if (loading) return <SkeletonLoader />;

  return (
    <div>
      <div className="max-w-4xl mx-auto bg-bg-card border border-border shadow-sm rounded-sm p-8">

        {/* Header */}
        <div className="flex items-start justify-between border-b pb-6">
          <div className="flex items-center gap-6">
            <div
              onClick={editMode ? handleAvatarClick : undefined}
              className="relative cursor-pointer"
            >
              <img
                src={avatarPreview}
                className="w-24 h-24 rounded-full object-cover border border-border"
              />
              {editMode && (
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center text-white">
                  <Camera size={20} />
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

            <div>
              {editMode ? (
                <div className="flex gap-2">
                  <input
                    value={patient.firstName}
                    onChange={(e) =>
                      handleChange("firstName", e.target.value)
                    }
                    className="border-b border-border text-xl font-semibold outline-none bg-transparent"
                  />
                  <input
                    value={patient.lastName}
                    onChange={(e) =>
                      handleChange("lastName", e.target.value)
                    }
                    className="border-b border-border text-xl font-semibold outline-none bg-transparent"
                  />
                </div>
              ) : (
                <h1 className="text-2xl font-semibold text-text-primary">
                  {patient.firstName} {patient.lastName}
                </h1>
              )}

              <p className="text-sm text-text-secondary mt-1">
                Last Visit: {patient.lastVisit}
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-lg hover:bg-bg-hover transition text-text-primary"
          >
            {editMode ? <Save size={16} /> : <Edit3 size={16} />}
            {editMode ? "Save" : "Edit"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-6 border-b border-border text-sm">
          {["overview", "appointments", "prescriptions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 capitalize transition ${activeTab === tab
                ? "border-b-2 border-primary text-text-primary font-medium"
                : "text-text-secondary hover:text-text-primary"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="grid md:grid-cols-2 gap-6">
              <EditableField
                label="Email"
                value={patient.email}
                editMode={editMode}
                onChange={(v: string) => handleChange("email", v)}
              />
              <EditableField
                label="Phone"
                value={patient.phoneNo}
                editMode={editMode}
                onChange={(v: string) => handleChange("phoneNo", v)}
              />
              <EditableField
                label="Blood Group"
                value={patient.bloodGroup}
                editMode={editMode}
                onChange={(v: string) => handleChange("bloodGroup", v)}
              />
              <EditableField
                label="Allergies"
                value={patient.allergies}
                editMode={editMode}
                onChange={(v: string) => handleChange("allergies", v)}
              />
              <EditableField
                label="Health Condition"
                value={patient.healthCondition}
                editMode={editMode}
                onChange={(v: string) =>
                  handleChange("healthCondition", v)
                }
              />
            </div>
          )}

          {activeTab === "appointments" && <Timeline />}
          {activeTab === "prescriptions" && (
            <p className="text-text-secondary text-sm">
              No prescriptions available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Components ---------- */

function EditableField({ label, value, editMode, onChange }: any) {
  return (
    <div className="border border-border rounded-xl p-4 bg-bg-light">
      <p className="text-xs text-text-secondary">{label}</p>
      {editMode ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full border-b border-border outline-none font-medium bg-transparent"
        />
      ) : (
        <p className="mt-1 font-medium text-text-primary">{value}</p>
      )}
    </div>
  );
}

function Timeline() {
  const visits = [
    { date: "2026-02-12", note: "Routine Checkup" },
    { date: "2025-11-02", note: "Blood Test" },
    { date: "2025-06-18", note: "Initial Consultation" },
  ];

  return (
    <div className="space-y-4">
      {visits.map((visit, index) => (
        <div key={index} className="border-l-2 border-border pl-4">
          <p className="font-medium text-text-primary">{visit.note}</p>
          <p className="text-xs text-text-secondary">{visit.date}</p>
        </div>
      ))}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-pulse space-y-4">
        <div className="w-24 h-24 bg-bg-light border border-border rounded-full mx-auto"></div>
        <div className="h-5 bg-bg-light border border-border rounded w-40 mx-auto"></div>
      </div>
    </div>
  );
}