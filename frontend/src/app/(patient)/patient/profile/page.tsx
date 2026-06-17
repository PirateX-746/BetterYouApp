"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Camera, Edit3, Save, Loader2,
  User, Shield, Bell, Palette,
  Eye, EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/components/containers/layout/ThemeProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/* ─── Tabs ─── */
const TABS = ["profile", "security", "notifications", "appearance"] as const;
type Tab = typeof TABS[number];

const TAB_META: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile",       label: "Profile",       icon: User    },
  { id: "security",      label: "Security",      icon: Shield  },
  { id: "notifications", label: "Notifications", icon: Bell    },
  { id: "appearance",    label: "Appearance",    icon: Palette },
];

/* ─── Zod schema for password change ─── */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword:     z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/* ─── Notifications ─── */
const NOTIFICATION_OPTIONS = [
  { id: "email", title: "Email Notifications", description: "Appointment reminders via email", defaultOn: true },
  { id: "sms",   title: "SMS Notifications",   description: "Text alerts for important updates", defaultOn: false },
  { id: "push",  title: "Push Notifications",  description: "Real-time browser alerts", defaultOn: true },
];

/* ─── Main page ─── */
export default function PatientProfilePage() {
  const userId = useLocalStorage("userId");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving]     = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [avatarPreview, setAvatarPreview] = useState("");

  const { patient, draft, setDraft, setPatient, loading } = useProfile(userId);

  useEffect(() => {
    if (patient.avatarBase64) setAvatarPreview(patient.avatarBase64);
  }, [patient.avatarBase64]);

  const handleChange = (field: keyof typeof draft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setDraft((prev) => ({ ...prev, avatarBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email: _email, ...updatePayload } = draft;
      await api.patch(`/patients/${userId}`, updatePayload);
      setPatient(draft);
      setEditMode(false);
      toast.success("Profile updated");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  const initials = `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`.toUpperCase() || "P";

  return (
    <div className="w-full space-y-4 pb-8">
      {/* ── Profile header card ── */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5" />
        <div className="px-4 pb-4 -mt-10">
          <div className="flex items-end justify-between mb-3">
            {/* Avatar */}
            <div
              onClick={editMode ? () => fileInputRef.current?.click() : undefined}
              className={`relative ${editMode ? "cursor-pointer" : ""}`}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt={`${patient.firstName} ${patient.lastName}`}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-bg-card shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-4 border-bg-card shadow-sm flex items-center justify-center text-primary font-bold text-2xl">
                  {initials}
                </div>
              )}
              {editMode && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <Camera size={18} className="text-white" />
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>

            {/* Edit / Save — only shown on profile tab */}
            {activeTab === "profile" && (
              <button onClick={editMode ? () => void handleSave() : () => { setDraft(patient); setEditMode(true); }}
                disabled={saving}
                className="flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-xl hover:bg-bg-hover transition text-text-primary disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : editMode ? <Save size={15} /> : <Edit3 size={15} />}
                {saving ? "Saving…" : editMode ? "Save" : "Edit"}
              </button>
            )}
          </div>

          {/* Name inline edit */}
          {editMode ? (
            <div className="flex gap-2 mb-1">
              <input value={draft.firstName} onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="First name"
                className="border-b border-border text-lg font-semibold outline-none bg-transparent w-1/2 pb-1 text-text-primary" />
              <input value={draft.lastName} onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Last name"
                className="border-b border-border text-lg font-semibold outline-none bg-transparent w-1/2 pb-1 text-text-primary" />
            </div>
          ) : (
            <h1 className="text-xl font-semibold text-text-primary">
              {patient.firstName} {patient.lastName}
            </h1>
          )}
          {patient.email && (
            <p className="text-xs text-text-secondary mt-0.5">{patient.email}</p>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-bg-card border border-border rounded-2xl p-1 overflow-x-auto">
        {TAB_META.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); if (id !== "profile") setEditMode(false); }}
              className={`flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap
                ${active ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"}`}>
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "profile" && (
        <ProfileFields draft={draft} patient={patient} editMode={editMode} onChange={handleChange} />
      )}
      {activeTab === "security" && (
        <SecurityPanel userId={userId} />
      )}
      {activeTab === "notifications" && (
        <NotificationsPanel />
      )}
      {activeTab === "appearance" && (
        <AppearancePanel />
      )}
    </div>
  );
}

/* ─── Profile fields ─── */
function ProfileFields({
  draft, patient, editMode, onChange,
}: {
  draft: ReturnType<typeof useProfile>["draft"];
  patient: ReturnType<typeof useProfile>["patient"];
  editMode: boolean;
  onChange: (field: keyof typeof draft, value: string) => void;
}) {
  const FIELDS: { label: string; field: keyof typeof draft; readOnly?: boolean; type?: string }[] = [
    { label: "Email",            field: "email",           readOnly: true },
    { label: "Phone",            field: "phoneNo" },
    { label: "Date of Birth",    field: "dateOfBirth" },
    { label: "Blood Group",      field: "bloodGroup" },
    { label: "Allergies",        field: "allergies" },
    { label: "Health Condition", field: "healthCondition" },
  ];

  return (
    <div className="bg-bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
      {FIELDS.map(({ label, field, readOnly }) => {
        const value = editMode ? (draft[field] as string) : (patient[field] as string);
        return (
          <div key={field} className="flex items-center gap-4 px-4 py-3.5">
            <p className="text-xs text-text-secondary w-32 shrink-0 flex items-center gap-1">
              {label}
              {readOnly && (
                <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-bg-hover text-text-disabled">
                  fixed
                </span>
              )}
            </p>
            {editMode && !readOnly ? (
              <input value={value ?? ""} onChange={(e) => onChange(field, e.target.value)}
                className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-border pb-0.5 text-text-primary min-w-0" />
            ) : (
              <p className="flex-1 text-sm font-medium text-text-primary text-right truncate">
                {value || <span className="text-text-secondary italic font-normal">Not set</span>}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Security tab ─── */
function SecurityPanel({ userId }: { userId: string | null }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (data: ChangePasswordValues) => {
    if (!userId) return;
    try {
      await api.post(`/patients/${userId}/change-password`, {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      });
      toast.success("Password updated");
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to update password");
    }
  };

  const fieldCls = "h-10 bg-bg-page border-border focus:border-primary rounded-xl pr-10";

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Security</h2>
        <p className="text-sm text-text-secondary mt-0.5">Change your account password</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Current Password</Label>
          <div className="relative">
            <Input type={showCurrent ? "text" : "password"} {...register("currentPassword")}
              placeholder="Enter current password" className={fieldCls} />
            <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.currentPassword && <p className="text-xs text-danger">{errors.currentPassword.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input type={showNew ? "text" : "password"} {...register("newPassword")}
                placeholder="New password" className={fieldCls} />
              <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-danger">{errors.newPassword.message}</p>}
            <p className="text-xs text-text-disabled">Min 8 characters</p>
          </div>

          <div className="space-y-1.5">
            <Label>Confirm Password</Label>
            <div className="relative">
              <Input type={showConfirm ? "text" : "password"} {...register("confirmPassword")}
                placeholder="Re-enter password" className={fieldCls} />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => reset()} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 size={14} className="animate-spin mr-1.5" />}
            {isSubmitting ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ─── Notifications tab ─── */
function NotificationsPanel() {
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(NOTIFICATION_OPTIONS.map((o) => [o.id, o.defaultOn]))
  );

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
        <p className="text-sm text-text-secondary mt-0.5">Choose how and when to be notified</p>
      </div>
      <div className="space-y-4">
        {NOTIFICATION_OPTIONS.map((opt) => (
          <div key={opt.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">{opt.title}</p>
              <p className="text-xs text-text-secondary mt-0.5">{opt.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={toggles[opt.id]}
              onClick={() => setToggles((p) => ({ ...p, [opt.id]: !p[opt.id] }))}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                toggles[opt.id] ? "bg-primary" : "bg-border"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                toggles[opt.id] ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Appearance tab ─── */
function AppearancePanel() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Appearance</h2>
        <p className="text-sm text-text-secondary mt-0.5">Customise the look of your portal</p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-primary">Dark Mode</p>
          <p className="text-xs text-text-secondary mt-0.5">Switch between light and dark theme</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          onClick={toggleDarkMode}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            darkMode ? "bg-primary" : "bg-border"
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
            darkMode ? "translate-x-4" : "translate-x-0"
          }`} />
        </button>
      </div>
    </div>
  );
}
