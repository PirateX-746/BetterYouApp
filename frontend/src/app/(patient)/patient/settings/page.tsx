"use client";

import { useState } from "react";
import { User, Shield, Bell, Palette } from "lucide-react";
import SettingsSidebar from "@/components/containers/settings/SettingsSidebar";
import ProfileTab from "@/components/containers/settings/ProfileTab";
import SecurityTab from "@/components/containers/settings/SecurityTab";
import NotificationsTab from "@/components/containers/settings/NotificationsTab";
import AppearanceTab from "@/components/containers/settings/AppearanceTab";

type Tab = "profile" | "security" | "notifications" | "appearance";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const TAB_CONTENT: Record<Tab, React.ReactNode> = {
  profile: <ProfileTab />,
  security: <SecurityTab />,
  notifications: <NotificationsTab />,
  appearance: <AppearanceTab />,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      {/* Mobile: horizontal scroll tab bar */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "bg-bg-card border border-border text-text-secondary hover:border-primary/40"
                }`}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Desktop: sidebar + content */}
      <div className="hidden md:grid md:grid-cols-[200px_1fr] gap-6">
        <SettingsSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as Tab)}
        />
        <div className="bg-bg-card border border-border rounded-xl p-6 min-h-[400px]">
          {TAB_CONTENT[activeTab]}
        </div>
      </div>

      {/* Mobile: content panel */}
      <div className="md:hidden bg-bg-card border border-border rounded-xl p-4">
        {TAB_CONTENT[activeTab]}
      </div>
    </div>
  );
}
