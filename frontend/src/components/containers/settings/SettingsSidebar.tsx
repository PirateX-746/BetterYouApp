"use client";

import { User, Lock, Bell, Palette } from "lucide-react";
import styles from "./Settings.module.css";

type Props = {
    activeTab: string;
    setActiveTab: (tab: string) => void;
};

const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
];

export default function SettingsSidebar({ activeTab, setActiveTab }: Props) {
    return (
        <aside className={styles.settingsSidebar}>
            <nav className={styles.settingsSidebarNav}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ""}`}
                        >
                            <Icon className={styles.navIcon} />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
