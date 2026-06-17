"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { changePasswordSchema, type ChangePasswordValues } from "@/schemas/settings.schema";

const fieldCls =
  "h-10 bg-bg-page border-border focus:border-primary focus:ring-primary/20 rounded-xl";

export default function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const onSubmit = async (data: ChangePasswordValues) => {
    if (!userId) return;
    try {
      await api.patch(`/practitioners/${userId}`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated");
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Failed to update password");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Security</h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Manage your password and security preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Current password */}
        <div className="space-y-1.5">
          <Label>Current Password</Label>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password"
              className={`${fieldCls} pr-10`}
              {...register("currentPassword")}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary">
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-danger">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New + confirm row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="New password"
                className={`${fieldCls} pr-10`}
                {...register("newPassword")}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-danger">{errors.newPassword.message}</p>
            )}
            <p className="text-xs text-text-disabled">Min 8 chars, 1 uppercase, 1 number</p>
          </div>

          <div className="space-y-1.5">
            <Label>Confirm Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                className={`${fieldCls} pr-10`}
                {...register("confirmPassword")}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => reset()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            {isSubmitting ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
