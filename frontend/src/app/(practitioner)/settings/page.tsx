"use client";

import { useState } from "react";
import SettingsSidebar from "@/components/containers/settings/SettingsSidebar";
import ProfileTab from "@/components/containers/settings/ProfileTab";
import SecurityTab from "@/components/containers/settings/SecurityTab";
import NotificationsTab from "@/components/containers/settings/NotificationsTab";
import AppearanceTab from "@/components/containers/settings/AppearanceTab";
import { useNotification } from "@/hooks/useNotification";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { NotificationUI } = useNotification();

  const renderTab = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab />;
      case "security":
        return <SecurityTab />;
      case "notifications":
        return <NotificationsTab />;
      case "appearance":
        return <AppearanceTab />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">

      <div className="mb-10">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--text-light)]">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex gap-8 lg:flex-col">
        <SettingsSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-md p-8">
          {renderTab()}
        </div>
      </div>

      <NotificationUI />
    </div>
  );
}
