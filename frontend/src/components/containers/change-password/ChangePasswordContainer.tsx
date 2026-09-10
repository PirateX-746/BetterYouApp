"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, AlertCircle, Brain, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { changePassword } from "@/lib/auth";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/schemas/auth.schema";

export default function ChangePasswordContainer() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (data: ChangePasswordValues) => {
    setServerError("");
    try {
      await changePassword({ newPassword: data.newPassword });

      const role = localStorage.getItem("role");
      router.replace(role === "practitioner" ? "/dashboard" : "/patient/home");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(
        e?.response?.data?.message ??
          (err instanceof Error ? err.message : null) ??
          "Could not update password. Please try again.",
      );
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/80 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] border border-white/40 p-10">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Brain className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
            Better<span className="text-primary">You</span>
          </h1>
        </div>

        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">
            Set a new password
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            You signed in with a temporary password. Choose a new password to
            continue.
          </p>
        </div>

        {serverError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-sm font-medium text-gray-600">
              New password
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting}
                placeholder="••••••••"
                className="h-11 bg-white/90 border-gray-200 focus:border-primary focus:ring-primary/20 rounded-xl pr-10"
                {...register("newPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-600">
              Confirm new password
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              disabled={isSubmitting}
              placeholder="••••••••"
              className="h-11 bg-white/90 border-gray-200 focus:border-primary focus:ring-primary/20 rounded-xl"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
