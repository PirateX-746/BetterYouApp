"use client";

import { Globe, ShieldCheck, KeyRound, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PageHeader,
  Panel,
  StatusPill,
} from "@/components/containers/superadmin/console-ui";
import { ChangePasswordPanel } from "@/components/containers/superadmin/ChangePasswordPanel";

const RESERVED_SUBDOMAINS = [
  "www", "api", "admin", "app", "mail", "static", "assets",
];

export default function PlatformSettingsPage() {
  return (
    <>
      <PageHeader
        title="Platform settings"
        subtitle="Configuration that applies across every practice"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChangePasswordPanel />

        {/* Domain */}
        <Panel title="Domain" padded>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="root-domain">Root domain</Label>
              <Input id="root-domain" defaultValue="betteryou.app" readOnly />
              <p className="text-xs text-text-disabled">
                Practices are served at{" "}
                <span className="font-mono">&lt;subdomain&gt;.betteryou.app</span>{" "}
                via a wildcard DNS record. Creating a practice never touches DNS.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-subdomain">Console subdomain</Label>
              <Input id="admin-subdomain" defaultValue="admin" readOnly />
              <p className="text-xs text-text-disabled">
                This console lives at{" "}
                <span className="font-mono">admin.betteryou.app</span>.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={14} className="text-text-disabled" />
                <p className="text-xs font-medium text-text-primary">
                  Reserved subdomains
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RESERVED_SUBDOMAINS.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-mono px-2 py-1 rounded-md bg-bg-light text-text-secondary"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-xs text-text-disabled mt-2">
                Rejected at practice creation so a tenant can never collide with
                platform infrastructure.
              </p>
            </div>
          </div>
        </Panel>

        {/* Security posture */}
        <Panel title="Security" padded>
          <ul className="space-y-4">
            {[
              {
                icon: ShieldCheck,
                title: "Session cookies",
                detail: "HttpOnly, SameSite, Secure in production",
                status: "Live",
                tone: "success" as const,
              },
              {
                icon: Ban,
                title: "Clinical data in console",
                detail: "Counts and metadata only — no patient records",
                status: "Enforced",
                tone: "success" as const,
              },
              {
                icon: KeyRound,
                title: "Two-factor authentication",
                detail: "For platform admin accounts",
                status: "Planned",
                tone: "neutral" as const,
              },
              {
                icon: ShieldCheck,
                title: "Login attempt monitoring",
                detail: "Rate limiting and lockout on the console",
                status: "Planned",
                tone: "neutral" as const,
              },
            ].map(({ icon: Icon, title, detail, status, tone }) => (
              <li key={title} className="flex items-start gap-3">
                <Icon size={16} className="text-text-disabled shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{title}</p>
                  <p className="text-xs text-text-secondary">{detail}</p>
                </div>
                <StatusPill label={status} tone={tone} />
              </li>
            ))}
          </ul>
        </Panel>

        {/* Admins */}
        <Panel title="Platform administrators" padded>
          <p className="text-sm text-text-secondary mb-4">
            Platform admins live in their own collection and never carry a
            practice. They cannot be a practitioner or a patient — the
            separation is structural, not a runtime check.
          </p>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-light">
            <div className="w-9 h-9 rounded-full bg-purple flex items-center justify-center text-white text-xs font-semibold shrink-0">
              PA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">
                platform@betteryou.app
              </p>
              <p className="text-xs text-text-secondary">Super Admin</p>
            </div>
            <StatusPill label="Active" tone="success" />
          </div>
          <Button
            variant="outline"
            className="w-full mt-4"
            disabled
            title="Needs the platform backend"
          >
            Invite administrator
          </Button>
        </Panel>

        {/* Defaults */}
        <Panel title="New practice defaults" padded>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="default-plan">Starting plan</Label>
              <select
                id="default-plan"
                defaultValue="TRIAL"
                className="w-full h-9 px-3 rounded-md border border-border bg-bg-card text-sm text-text-primary focus:outline-none focus:border-primary transition"
              >
                <option value="TRIAL">Trial</option>
                <option value="FREE">Free</option>
                <option value="BASIC">Basic</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trial-days">Trial length (days)</Label>
              <Input id="trial-days" type="number" defaultValue={30} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default-tz">Default timezone</Label>
              <Input id="default-tz" defaultValue="Asia/Kolkata" />
            </div>

            <Button className="w-full" disabled title="Needs the platform backend">
              Save defaults
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
