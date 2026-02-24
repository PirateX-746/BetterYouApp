"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  // Simulated loading
  useEffect(() => {
    setTimeout(() => setLoading(false), 1500);
  }, []);

  const handleChange = (field: string, value: string) => {
    setPatient({ ...patient, [field]: value });
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
    }
  };

  if (loading) return <SkeletonLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-10 relative">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-3xl p-8">

        {/* Floating Edit Button */}
        <button
          onClick={() => setEditMode(!editMode)}
          className="fixed bottom-10 right-10 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-105 transition"
        >
          {editMode ? <Save size={20} /> : <Edit3 size={20} />}
        </button>

        {/* Header */}
        <div className="flex items-center gap-8 border-b pb-8">

          {/* Avatar */}
          <div className="relative group">
            <motion.img
              layout
              src={avatarPreview}
              className="w-36 h-36 rounded-full object-cover border-4 border-blue-100 shadow-md"
            />

            {editMode && (
              <button
                onClick={handleAvatarClick}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white"
              >
                <Camera size={28} />
              </button>
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
              <div className="flex gap-3">
                <input
                  value={patient.firstName}
                  onChange={(e) =>
                    handleChange("firstName", e.target.value)
                  }
                  className="border-b outline-none text-2xl font-bold"
                />
                <input
                  value={patient.lastName}
                  onChange={(e) =>
                    handleChange("lastName", e.target.value)
                  }
                  className="border-b outline-none text-2xl font-bold"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-bold text-gray-800">
                {patient.firstName} {patient.lastName}
              </h1>
            )}

            <p className="text-gray-500 mt-1">
              Last Visit: {patient.lastVisit}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mt-8 border-b pb-4">
          {["overview", "appointments", "prescriptions"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize pb-2 ${activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-8 mt-8"
            >
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
            </motion.div>
          )}

          {activeTab === "appointments" && (
            <motion.div
              key="appointments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8"
            >
              <Timeline />
            </motion.div>
          )}

          {activeTab === "prescriptions" && (
            <motion.div
              key="prescriptions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8"
            >
              <p className="text-gray-500">
                No prescriptions available.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- Reusable Components ---------------- */

function EditableField({ label, value, editMode, onChange }: any) {
  return (
    <div className="bg-blue-50 p-5 rounded-xl shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      {editMode ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-transparent border-b outline-none font-medium"
        />
      ) : (
        <p className="mt-1 font-medium text-gray-800">{value}</p>
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
    <div className="space-y-6">
      {visits.map((visit, index) => (
        <div key={index} className="flex gap-4">
          <div className="w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
          <div>
            <p className="font-medium">{visit.note}</p>
            <p className="text-sm text-gray-500">{visit.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse space-y-4">
        <div className="w-40 h-40 bg-gray-200 rounded-full mx-auto"></div>
        <div className="h-6 bg-gray-200 rounded w-60 mx-auto"></div>
      </div>
    </div>
  );
}