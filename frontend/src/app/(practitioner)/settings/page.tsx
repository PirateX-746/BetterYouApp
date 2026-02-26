"use client";

import { useState } from "react";
import SettingsSidebar from "@/components/containers/settings/SettingsSidebar";
import ProfileTab from "@/components/containers/settings/ProfileTab";
import SecurityTab from "@/components/containers/settings/SecurityTab";
import NotificationsTab from "@/components/containers/settings/NotificationsTab";
import AppearanceTab from "@/components/containers/settings/AppearanceTab";
import styles from "@/components/containers/settings/Settings.module.css";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

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
    <div className={styles.settingsContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>
          Manage your account and preferences
        </p>
      </div>

      <div className={styles.settingsLayout}>
        <SettingsSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <div className={styles.contentPanel}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
