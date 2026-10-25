"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  acceptInvitation,
  lookupInvitation,
  roleLabel,
  type InvitationLookup,
} from "@/lib/invitations";

/**
 * Public invitation acceptance.
 *
 * The token in the query string is the only credential — the invitee has no
 * account until this form is submitted. The backend is the sole authority on
 * whether a token is valid, used, revoked or expired; this page renders
 * whatever reason it gives rather than trying to judge for itself.
 */

const MIN_PASSWORD = 8;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-violet-200 dark:bg-violet-900/30 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 dark:bg-indigo-900/30 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] border border-white/40 dark:border-white/10 p-10">
        {children}
      </div>
    </div>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [invite, setInvite] = useState<InvitationLookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const describe = useCallback((err: unknown, fallback: string) => {
    const e = err as { response?: { status?: number; data?: { message?: string } } };
    if (e?.response?.status === 429) {
      return "Too many attempts. Please wait a minute and try again.";
    }
    return e?.response?.data?.message ?? fallback;
  }, []);

  useEffect(() => {
    if (!token) {
      setLookupError("This invitation link is missing its token.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    lookupInvitation(token)
      .then((res) => {
        if (!cancelled) setInvite(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLookupError(describe(err, "This invitation link is not valid."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, describe]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const weak =
      password.length < MIN_PASSWORD ? `Password must be at least ${MIN_PASSWORD} characters.`
      : !/[A-Z]/.test(password) ? "Password must contain an uppercase letter."
      : !/[0-9]/.test(password) ? "Password must contain a number."
      : !/[!@#$%^&*]/.test(password) ? "Password must contain a special character (!@#$%^&*)."
      : null;
    if (weak) {
      setError(weak);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await acceptInvitation(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(describe(err, "Could not accept this invitation."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={22} className="animate-spin text-primary" />
          <p className="text-sm text-text-secondary">Checking invitation…</p>
        </div>
      </Shell>
    );
  }

  if (lookupError || !invite) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-danger-light">
            <AlertCircle className="w-7 h-7 text-danger-strong" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Invitation unavailable
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {lookupError}
          </p>
          <p className="text-xs text-text-disabled leading-relaxed">
            Invitations expire after seven days. Ask your practice
            administrator to send a new one.
          </p>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-success-light">
            <CheckCircle2 className="w-7 h-7 text-success-strong" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            You&rsquo;re all set
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your account at{" "}
            <span className="font-medium text-text-primary">
              {invite.practiceName ?? "your practice"}
            </span>{" "}
            is ready. Sign in with{" "}
            <span className="font-medium text-text-primary">{invite.email}</span>{" "}
            and the password you just chose.
          </p>
          <Button
            className="w-full mt-2"
            onClick={() => router.replace("/practitionerLogin")}
          >
            Go to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-light mb-3">
          <Stethoscope className="w-7 h-7 text-purple" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Better<span className="text-primary">You</span>
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          {invite.name}, you&rsquo;ve been invited to join{" "}
          <span className="font-medium text-text-primary">
            {invite.practiceName ?? "a practice"}
          </span>
          .
        </p>
        <div className="inline-block text-[11px] font-semibold uppercase tracking-wider text-purple bg-purple-light px-2.5 py-1 rounded-md">
          {roleLabel(invite.role)}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl border border-danger bg-danger-light">
          <AlertCircle size={16} className="text-danger-strong shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">{error}</p>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email address</Label>
          <Input
            id="invite-email"
            type="email"
            value={invite.email}
            readOnly
            disabled
            autoComplete="username"
          />
          <p className="text-[11px] text-text-disabled">
            Fixed by the invitation — it cannot be changed here.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-password">Choose a password</Label>
          <div className="relative">
            <Input
              id="invite-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-10"
              minLength={MIN_PASSWORD}
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
          <p className="text-[11px] text-text-disabled">
            At least {MIN_PASSWORD} characters, with an uppercase letter, a number and a special character (!@#$%^&amp;*).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-confirm">Confirm password</Label>
          <Input
            id="invite-confirm"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Create my account
        </Button>
      </form>

      <p className="text-xs text-text-disabled text-center mt-6">
        Already have an account?{" "}
        <Link href="/practitionerLogin" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Shell>
  );
}

export default function AcceptInvitePage() {
  // useSearchParams needs a Suspense boundary to keep the route prerenderable.
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={22} className="animate-spin text-primary" />
            <p className="text-sm text-text-secondary">Loading…</p>
          </div>
        </Shell>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}
