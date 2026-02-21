"use client";

import { useTheme } from "@/components/containers/layout/ThemeProvider";
import styles from "./Settings.module.css";

export default function AppearanceTab() {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <div className={styles.settingsItem}>
            <div className={styles.settingsItemContent}>
                <p className={styles.settingsItemTitle}>
                    Dark Mode
                </p>
                <p className={styles.settingsItemDescription}>
                    Switch between light and dark theme
                </p>
            </div>
            <label className={styles.toggleSwitch}>
                <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={() =>
                        toggleDarkMode()
                    }
                />
                <span className={styles.toggleSlider}></span>
            </label>
        </div>
    );
}
