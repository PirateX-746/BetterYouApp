"use client";

import { useTheme } from "@/components/containers/layout/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import styles from "./Settings.module.css";

export default function AppearanceTab() {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <>
            <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>Appearance</h2>
                <p className={styles.tabDescription}>
                    Customize the look and feel of your interface
                </p>
            </div>

            <div className={styles.tabBody}>
                <div className={styles.settingsList}>
                    <div className={styles.settingsItem}>
                        <div className={styles.settingsItemContent}>
                            <p className={styles.settingsItemTitle}>
                                {darkMode ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <Moon size={16} /> Dark Mode
                                    </span>
                                ) : (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                        <Sun size={16} /> Light Mode
                                    </span>
                                )}
                            </p>
                            <p className={styles.settingsItemDescription}>
                                Switch between light and dark theme
                            </p>
                        </div>
                        <label className={styles.toggleSwitch}>
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={toggleDarkMode}
                            />
                            <span className={styles.toggleSlider} />
                        </label>
                    </div>
                </div>
            </div>
        </>
    );
}
