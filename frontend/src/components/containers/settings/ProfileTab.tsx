"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { practitionerProfileSchema, type PractitionerProfileValues } from "@/schemas/settings.schema";

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "U";
}

export default function ProfileTab() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarBase64, setAvatarBase64] = useState("");
  const [savedAvatarBase64, setSavedAvatarBase64] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PractitionerProfileValues>({
    resolver: zodResolver(practitionerProfileSchema),
  });

  const firstName = watch("firstName") ?? "";
  const lastName  = watch("lastName")  ?? "";

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    api.get(`/practitioners/${userId}`)
      .then((res) => {
        const d = res.data;
        reset({
          firstName:       d.firstName       ?? "",
          lastName:        d.lastName        ?? "",
          specialization:  d.specialization  ?? "",
          experienceYears: d.experienceYears ?? "",
        });
        setEmail(d.email ?? "");
        if (d.avatarBase64) {
          setAvatarPreview(d.avatarBase64);
          setSavedAvatarBase64(d.avatarBase64);
          setAvatarBase64(d.avatarBase64);
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [userId, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setAvatarPreview(b64);
      setAvatarBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: PractitionerProfileValues) => {
    if (!userId) return;
    try {
      const payload: Record<string, unknown> = {
        firstName:      data.firstName,
        lastName:       data.lastName,
        specialization: data.specialization,
      };
      if (data.experienceYears !== "" && data.experienceYears !== undefined) {
        payload.experienceYears = Number(data.experienceYears);
      }
      if (avatarBase64 && avatarBase64 !== savedAvatarBase64) {
        payload.avatarBase64 = avatarBase64;
      }
      const res = await api.patch(`/practitioners/${userId}`, payload);
      const d = res.data;
      reset({
        firstName:       d.firstName       ?? "",
        lastName:        d.lastName        ?? "",
        specialization:  d.specialization  ?? "",
        experienceYears: d.experienceYears ?? "",
      });
      if (d.avatarBase64) {
        setSavedAvatarBase64(d.avatarBase64);
        setAvatarBase64(d.avatarBase64);
      }
      document.cookie = `name=${encodeURIComponent(d.firstName ?? "")}; path=/; SameSite=Lax`;
      localStorage.setItem("name", d.firstName ?? "");
      toast.success("Profile saved");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to save");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  const hasChanges = isDirty || avatarBase64 !== savedAvatarBase64;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Profile</h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Update your personal information and profile photo
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="relative group shrink-0">
          {avatarPreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarPreview} alt="Profile" className="w-16 h-16 rounded-2xl object-cover border-2 border-border" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl border-2 border-border">
              {getInitials(firstName, lastName)}
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <Camera size={18} className="text-white" />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </button>
        <div>
          <p className="text-sm font-medium text-text-primary">Profile Photo</p>
          <p className="text-xs text-text-secondary">JPG, PNG or GIF · Max 2 MB</p>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline mt-1">
            Change photo
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>First Name</Label>
            <Input {...register("firstName")} placeholder="First name" />
            {errors.firstName && <p className="text-xs text-danger">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Last Name</Label>
            <Input {...register("lastName")} placeholder="Last name" />
            {errors.lastName && <p className="text-xs text-danger">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            Email{" "}
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-bg-hover text-text-disabled ml-1">fixed</span>
          </Label>
          <Input value={email} readOnly className="opacity-60 cursor-not-allowed" disabled />
        </div>

        <div className="space-y-1.5">
          <Label>Specialization</Label>
          <Input {...register("specialization")} placeholder="e.g. Clinical Psychology" />
          {errors.specialization && <p className="text-xs text-danger">{errors.specialization.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Years of Experience</Label>
          <Input type="number" min={0} max={60} {...register("experienceYears")} placeholder="e.g. 5" />
          {errors.experienceYears && <p className="text-xs text-danger">{String(errors.experienceYears.message)}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => { reset(); setAvatarBase64(savedAvatarBase64); setAvatarPreview(savedAvatarBase64); }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !hasChanges}>
            {isSubmitting ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Save size={15} className="mr-1.5" />}
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
