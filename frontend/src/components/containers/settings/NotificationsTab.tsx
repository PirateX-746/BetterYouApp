"use client";

import { useState } from "react";
import styles from "./Settings.module.css";

export default function NotificationsTab() {
    const [emailNotifications, setEmailNotifications] = useState(true);

    return (
        <div className={styles.settingsList}>
            <div className={styles.settingsItem}>
                <div className={styles.settingsItemContent}>
                    <p className={styles.settingsItemTitle}>
                        Email Notifications
                    </p>
                    <p className={styles.settingsItemDescription}>
                        Receive updates via email
                    </p>
                </div>

                <label className={styles.toggleSwitch}>
                    <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={() =>
                            setEmailNotifications(!emailNotifications)
                        }
                    />
                    <span className={styles.toggleSlider}></span>
                </label>
            </div>
        </div>
    );
}
