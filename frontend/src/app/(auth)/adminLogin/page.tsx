"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { platformLogin } from "@/lib/superadmin/api";
import { setDisplayCookie } from "@/lib/session";
import { BrandLogo } from "@/components/common/BrandLogo";

/**
 * Platform console sign-in.
 *
 * A separate entrance from either portal: it posts to /auth/platform/login,
 * which only ever looks in the platformadmins collection. A practitioner's
 * credentials will not authenticate here.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await platformLogin(email, password);
      // Display data only — the session itself is an HttpOnly cookie the
      // backend set, which page scripts cannot read.
      try {
        localStorage.setItem("name", res.name);
        localStorage.setItem("role", res.role);
        localStorage.setItem("userId", res.id);
      } catch {
        /* storage unavailable — non-fatal */
      }
      setDisplayCookie("name", res.name);
      router.refresh();
      router.replace("/admin/dashboard");
    } catch (err: unknown) {
      const e2 = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      setError(
        e2?.response?.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : (e2?.response?.data?.message ?? "Invalid email or password."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-violet-200 dark:bg-violet-900/30 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 dark:bg-indigo-900/30 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] border border-white/40 dark:border-white/10 p-10">
        <div className="text-center mb-8 space-y-2">
          <BrandLogo size="lg" stacked asHeading className="mb-1" />
          <p className="text-sm text-text-secondary">
            Platform administration
          </p>
          <div className="inline-block text-[11px] font-semibold uppercase tracking-wider text-purple bg-purple-light px-2.5 py-1 rounded-md">
            Super Admin
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl border border-danger bg-danger-light">
            <AlertCircle size={16} className="text-danger-strong shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email address</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="platform@betteryou.app"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="text-xs text-text-disabled text-center mt-6">
          Platform accounts are separate from practice accounts. Practitioners
          sign in at their own practice address.
        </p>
      </div>
    </div>
  );
}
