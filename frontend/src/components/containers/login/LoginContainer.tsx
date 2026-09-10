"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, AlertCircle, Brain, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login } from "@/lib/auth";
import { loginSchema, type LoginValues } from "@/schemas/auth.schema";

interface LoginProps {
  role: "patient" | "practitioner";
}

export default function LoginContainer({ role }: LoginProps) {
  const router = useRouter();
  const isPatient = role === "patient";
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginValues) => {
    setServerError("");
    try {
      const res = await login({ ...data, role });

      // The session (token + role) is set by the backend as HttpOnly cookies
      // and is deliberately not readable here. What follows is display data
      // only — never treat it as proof of identity or permission.
      const cookieOpts = "path=/; SameSite=Lax";
      document.cookie = `name=${encodeURIComponent(res.name)}; ${cookieOpts}`;
      document.cookie = `userId=${res.id}; ${cookieOpts}`;

      localStorage.setItem("role",   res.role);
      localStorage.setItem("name",   res.name);
      localStorage.setItem("userId", res.id);
      localStorage.setItem("email",  data.email);

      router.refresh();

      if (res.mustChangePassword) {
        router.replace("/change-password");
        return;
      }

      router.replace(role === "practitioner" ? "/dashboard" : "/patient/home");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(
        e?.response?.data?.message ??
        (err instanceof Error ? err.message : null) ??
        "Invalid email or password. Please try again.",
      );
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/80 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] border border-white/40 p-10 transition-all duration-500">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Brain className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
            Better<span className="text-primary">You</span>
          </h1>
          <p className="text-sm text-gray-500">
            {isPatient ? "Welcome back. Continue your wellness journey." : "Secure practitioner access portal"}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/20 text-xs font-medium text-primary">
            {isPatient ? "Patient Portal" : "Practitioner Portal"}
          </div>
        </div>

        {serverError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-gray-600">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isSubmitting}
              placeholder="you@example.com"
              className="h-11 bg-white/90 border-gray-200 focus:border-primary focus:ring-primary/20 rounded-xl"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-gray-600">
                Password
              </Label>
              <Link
                href={isPatient ? "/patientForgotPassword" : "/practitioner/forgot-password"}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isSubmitting}
                placeholder="••••••••"
                className="h-11 bg-white/90 border-gray-200 focus:border-primary focus:ring-primary/20 rounded-xl pr-10"
                {...register("password")}
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
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
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
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {isPatient && (
          <p className="text-center text-sm text-gray-500 mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/patientSignup" className="text-primary font-medium hover:underline">
              Create account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
