"use client";

import { Page, PageHeader } from "@/components/common/PageLayout";
import { useState } from "react";
import SettingsSidebar from "@/components/containers/settings/SettingsSidebar";
import ProfileTab from "@/components/containers/settings/ProfileTab";
import SecurityTab from "@/components/containers/settings/SecurityTab";
import NotificationsTab from "@/components/containers/settings/NotificationsTab";
import AppearanceTab from "@/components/containers/settings/AppearanceTab";
import PracticeHoursTab from "@/components/containers/settings/PracticeHoursTab";
import AppointmentTypesTab from "@/components/containers/settings/AppointmentTypesTab";

type Tab =
  | "profile"
  | "security"
  | "notifications"
  | "appearance"
  | "practice-hours"
  | "appointment-types";

const TAB_COMPONENTS: Record<Tab, React.ReactNode> = {
  profile: <ProfileTab />,
  security: <SecurityTab />,
  notifications: <NotificationsTab />,
  appearance: <AppearanceTab />,
  "practice-hours": <PracticeHoursTab />,
  "appointment-types": <AppointmentTypesTab />,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="flex flex-col md:flex-row gap-4">
        <SettingsSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as Tab)}
        />
        <div className="flex-1 min-w-0 bg-bg-card border border-border rounded-2xl p-5">
          {TAB_COMPONENTS[activeTab]}
        </div>
      </div>
    </Page>
  );
}
