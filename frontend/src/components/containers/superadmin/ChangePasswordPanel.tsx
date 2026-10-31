"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth";
import { Panel } from "@/components/containers/superadmin/console-ui";

/** Platform accounts can see every practice, so the API requires 12+. */
const MIN_LENGTH = 12;

function problem(current: string, next: string, confirm: string) {
  if (!current) return "Enter your current password.";
  if (next.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters.`;
  if (!/[A-Z]/.test(next)) return "Include an uppercase letter.";
  if (!/[0-9]/.test(next)) return "Include a number.";
  if (!/[!@#$%^&*]/.test(next)) return "Include a special character (!@#$%^&*).";
  if (next !== confirm) return "The new passwords don't match.";
  return null;
}

/** Signed-in platform admin changes their own password (Settings). */
export function ChangePasswordPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const issue = problem(current, next, confirm);
    setError(issue ?? "");
    if (issue) return;

    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e2?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? "Couldn't update the password."));
    } finally {
      setSaving(false);
    }
  }

  const type = show ? "text" : "password";

  return (
    <Panel title="Change password" subtitle="For your platform admin account" padded>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Current password</Label>
          <Input
            id="pw-current"
            type={type}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-new">New password</Label>
          <Input
            id="pw-new"
            type={type}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <p className="text-xs text-text-disabled">
            At least {MIN_LENGTH} characters, with an uppercase letter, a number and a special
            character (!@#$%^&amp;*).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input
            id="pw-confirm"
            type={type}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-danger-strong">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {show ? "Hide passwords" : "Show passwords"}
          </Button>
          <Button type="submit" loading={saving}>
            Update password
          </Button>
        </div>
      </form>
    </Panel>
  );
}
