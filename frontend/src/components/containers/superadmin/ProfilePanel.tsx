"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/containers/superadmin/console-ui";
import { ADMIN_STORAGE } from "@/lib/portal";
import {
  ADMIN_NAME_EVENT,
  fetchAdminProfile,
  updateAdminProfile,
} from "@/lib/superadmin/api";

/** Signed-in platform admin edits their own name (Settings). */
export function ProfilePanel() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAdminProfile()
      .then((p) => {
        if (cancelled) return;
        setFirstName(p.firstName);
        setLastName(p.lastName);
      })
      .catch(() => !cancelled && setError("Couldn't load your profile."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError("Enter both your first and last name.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const p = await updateAdminProfile({ firstName: first, lastName: last });
      setFirstName(p.firstName);
      setLastName(p.lastName);
      try {
        localStorage.setItem(ADMIN_STORAGE.name, p.name);
      } catch {
        /* storage unavailable — the sidebar still hears the event */
      }
      window.dispatchEvent(new CustomEvent(ADMIN_NAME_EVENT, { detail: p.name }));
      toast.success("Profile updated");
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e2?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Your profile" subtitle="Your first and last name, shown in the console" padded>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-first">First name</Label>
            <Input
              id="profile-first"
              autoComplete="given-name"
              value={firstName}
              disabled={loading}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-last">Last name</Label>
            <Input
              id="profile-last"
              autoComplete="family-name"
              value={lastName}
              disabled={loading}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-xs text-danger-strong">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading || saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Panel>
  );
}
