"use client";

import { PageHeader } from "@/components/containers/superadmin/console-ui";
import { AccountDetailsPanel } from "@/components/containers/superadmin/AccountDetailsPanel";
import { ChangePasswordPanel } from "@/components/containers/superadmin/ChangePasswordPanel";
import { ProfilePanel } from "@/components/containers/superadmin/ProfilePanel";

export default function PlatformSettingsPage() {
  return (
    <>
      <PageHeader
        title="Platform settings"
        subtitle="Your platform admin account"
      />

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <AccountDetailsPanel />
        <ProfilePanel />
        <ChangePasswordPanel />
      </div>
    </>
  );
}
