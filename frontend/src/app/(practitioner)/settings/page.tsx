"use client";

import { useState } from "react";
import SettingsSidebar from "@/components/containers/settings/SettingsSidebar";
import ProfileTab from "@/components/containers/settings/ProfileTab";
import SecurityTab from "@/components/containers/settings/SecurityTab";
import NotificationsTab from "@/components/containers/settings/NotificationsTab";
import AppearanceTab from "@/components/containers/settings/AppearanceTab";

type Tab = "profile" | "security" | "notifications" | "appearance";

const TAB_COMPONENTS: Record<Tab, React.ReactNode> = {
  profile: <ProfileTab />,
  security: <SecurityTab />,
  notifications: <NotificationsTab />,
  appearance: <AppearanceTab />,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <SettingsSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as Tab)}
        />
        <div className="flex-1 min-w-0 bg-bg-card border border-border rounded-2xl p-5">
          {TAB_COMPONENTS[activeTab]}
        </div>
      </div>
    </div>
  );
}
