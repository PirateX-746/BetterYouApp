"use client";

import { useState } from "react";
import styles from "./Settings.module.css";

const notificationOptions = [
    {
        id: "email",
        title: "Email Notifications",
        description: "Receive appointment reminders and updates via email",
        defaultOn: true,
    },
    {
        id: "sms",
        title: "SMS Notifications",
        description: "Get text message alerts for important updates",
        defaultOn: false,
    },
    {
        id: "push",
        title: "Push Notifications",
        description: "Browser push notifications for real-time alerts",
        defaultOn: true,
    },
    {
        id: "marketing",
        title: "Marketing Emails",
        description: "Receive tips, product updates and promotional content",
        defaultOn: false,
    },
];

export default function NotificationsTab() {
    const [toggles, setToggles] = useState<Record<string, boolean>>(
        Object.fromEntries(notificationOptions.map((o) => [o.id, o.defaultOn]))
    );

    const toggle = (id: string) =>
        setToggles((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
        <>
            <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>Notifications</h2>
                <p className={styles.tabDescription}>
                    Choose how and when you want to be notified
                </p>
            </div>

            <div className={styles.tabBody}>
                <div className={styles.settingsList}>
                    {notificationOptions.map((opt) => (
                        <div key={opt.id} className={styles.settingsItem}>
                            <div className={styles.settingsItemContent}>
                                <p className={styles.settingsItemTitle}>{opt.title}</p>
                                <p className={styles.settingsItemDescription}>
                                    {opt.description}
                                </p>
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={toggles[opt.id]}
                                    onChange={() => toggle(opt.id)}
                                />
                                <span className={styles.toggleSlider} />
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
