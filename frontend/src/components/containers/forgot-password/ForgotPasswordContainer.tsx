"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  ArrowLeft,
  AlertCircle,
  Loader2,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forgotPassword, type ForgotPasswordResponse } from "@/lib/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/schemas/auth.schema";
import { BrandLogo } from "@/components/common/BrandLogo";

interface ForgotPasswordProps {
  role: "patient" | "practitioner";
}

export default function ForgotPasswordContainer({ role }: ForgotPasswordProps) {
  const isPatient = role === "patient";
  const loginHref = isPatient ? "/patientLogin" : "/practitionerLogin";

  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setServerError("");
    try {
      const res = await forgotPassword({ ...data, role });
      setResult(res);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(
        e?.response?.data?.message ??
          (err instanceof Error ? err.message : null) ??
          "Something went wrong. Please try again.",
      );
    }
  };

  const copyTempPassword = async () => {
    if (!result?.devTempPassword) return;
    await navigator.clipboard.writeText(result.devTempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/80 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] border border-white/40 p-10">
        <div className="text-center mb-8 space-y-2">
          <BrandLogo size="lg" stacked asHeading className="mb-1" />
        </div>

        {!result ? (
          <>
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Reset your password
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enter your {isPatient ? "patient" : "practitioner"} account
                email and we&apos;ll email you a temporary password.
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending…
                  </>
                ) : (
                  "Send temporary password"
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-1">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Check your email</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{result.message}</p>

            {result.devTempPassword && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                  <KeyRound size={14} />
                  Dev: Simulate email
                </p>
                <p className="text-xs text-amber-700/80">
                  No email provider is configured yet, so the temporary
                  password is shown here directly. This is valid for 1 hour
                  and will be required to change your password on next login.
                </p>
                <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-amber-200 px-3 py-2">
                  <code className="text-sm font-mono text-gray-800 select-all">
                    {result.devTempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={copyTempPassword}
                    className="text-amber-700 hover:text-amber-900 transition-colors"
                    aria-label="Copy temporary password"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <Link
            href={loginHref}
            className="flex items-center justify-center gap-2 w-full h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
