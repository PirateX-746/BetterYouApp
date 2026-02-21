"use client";

import clsx from "clsx";
import styles from "./Settings.module.css";

type Props = {
    activeTab: string;
    setActiveTab: (tab: string) => void;
};

export default function SettingsSidebar({ activeTab, setActiveTab }: Props) {
    const navItem =
        "flex items-center gap-3 w-full text-left px-4 py-2 rounded-sm text-sm font-medium transition-all";

    const tabs = [
        { id: "profile", label: "Profile" },
        { id: "security", label: "Security" },
        { id: "notifications", label: "Notifications" },
        { id: "appearance", label: "Appearance" },
    ];

    return (
        <div className={styles.settingsLayout}>
            <div className={styles.settingsSidebar}>
                <nav className={styles.settingsSidebarNav}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                navItem,
                                activeTab === tab.id
                                    ? "bg-[var(--primary-light)] text-[var(--primary)]"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-light)] hover:text-[var(--primary)]"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
}
