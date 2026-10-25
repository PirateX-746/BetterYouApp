"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/containers/layout/ThemeProvider";
import { isValidHex } from "@/lib/color";
import styles from "./Settings.module.css";

// Keep in sync with --primary in globals.css.
const DEFAULT_ACCENT = "#2563eb";

const ACCENT_PRESETS = [
    { name: "Slate", hex: "#1f2937" },
    { name: "Indigo", hex: "#6366f1" },
    { name: "Violet", hex: "#9333ea" },
    { name: "Blue", hex: DEFAULT_ACCENT },
    { name: "Sky", hex: "#38bdf8" },
    { name: "Teal", hex: "#14b8a6" },
    { name: "Green", hex: "#16a34a" },
    { name: "Rose", hex: "#f43f5e" },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Monitor }[] = [
    { mode: "system", label: "System preference", icon: Monitor },
    { mode: "light", label: "Light", icon: Sun },
    { mode: "dark", label: "Dark", icon: Moon },
];

export default function AppearanceTab() {
    const { themeMode, setThemeMode, accentColor, setAccentColor, resetAccentColor } = useTheme();
    const activeAccent = accentColor ?? DEFAULT_ACCENT;
    const [hexInput, setHexInput] = useState(activeAccent);

    useEffect(() => {
        setHexInput(activeAccent);
    }, [activeAccent]);

    const applyHexInput = () => {
        const value = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
        if (isValidHex(value)) {
            setAccentColor(value);
        } else {
            setHexInput(activeAccent);
        }
    };

    const isCustomActive = !ACCENT_PRESETS.some(
        (p) => p.hex.toLowerCase() === activeAccent.toLowerCase(),
    );

    return (
        <>
            <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>Appearance</h2>
                <p className={styles.tabDescription}>
                    Customize the look and feel of your interface
                </p>
            </div>

            <div className={styles.tabBody}>
                {/* Accent color */}
                <div className={styles.section}>
                    <p className={styles.sectionTitle}>Accent color</p>
                    <p className={styles.sectionHint}>
                        Update the portal to your brand color
                    </p>

                    <div className={styles.swatchRow}>
                        {ACCENT_PRESETS.map((preset) => {
                            const selected = activeAccent.toLowerCase() === preset.hex.toLowerCase();
                            return (
                                <button
                                    key={preset.hex}
                                    type="button"
                                    aria-label={preset.name}
                                    title={preset.name}
                                    onClick={() => setAccentColor(preset.hex)}
                                    className={`${styles.swatch} ${selected ? styles.swatchSelected : ""}`}
                                    style={{ background: preset.hex }}
                                >
                                    {selected && (
                                        <span className={styles.swatchCheck}>
                                            <Check size={14} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        <div className={styles.customSwatchGroup}>
                            <input
                                type="color"
                                aria-label="Custom color"
                                title="Pick a custom color"
                                value={isValidHex(activeAccent) ? activeAccent : DEFAULT_ACCENT}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className={`${styles.colorPickerSwatch} ${isCustomActive ? styles.swatchSelected : ""}`}
                            />
                            <span className={styles.customLabel}>Custom</span>
                            <input
                                id="accent-hex-input"
                                className={styles.hexInput}
                                value={hexInput}
                                onChange={(e) => setHexInput(e.target.value)}
                                onBlur={applyHexInput}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        applyHexInput();
                                    }
                                }}
                                spellCheck={false}
                                maxLength={7}
                            />
                        </div>
                    </div>

                    {accentColor && (
                        <button type="button" onClick={resetAccentColor} className={styles.resetLink}>
                            Reset to default
                        </button>
                    )}
                </div>

                {/* Interface theme */}
                <div className={styles.section}>
                    <p className={styles.sectionTitle}>Interface theme</p>
                    <p className={styles.sectionHint}>
                        Select or follow your system theme
                    </p>

                    <div className={styles.themeGrid}>
                        {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => {
                            const active = themeMode === mode;
                            const showLight = mode !== "dark";
                            const showDark = mode !== "light";
                            return (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setThemeMode(mode)}
                                    className={`${styles.themeCard} ${active ? styles.themeCardActive : ""}`}
                                >
                                    <div className={styles.themePreview}>
                                        {showLight && (
                                            <div className={`${styles.themePreviewHalf} ${styles.themePreviewLight}`}>
                                                <div
                                                    className={styles.themePreviewBar}
                                                    style={{ background: activeAccent, width: "40%" }}
                                                />
                                                <div
                                                    className={styles.themePreviewBar}
                                                    style={{ background: "#d3d8e0", width: "75%" }}
                                                />
                                                <div
                                                    className={styles.themePreviewBar}
                                                    style={{ background: "#d3d8e0", width: "55%" }}
                                                />
                                            </div>
                                        )}
                                        {showDark && (
                                            <div className={`${styles.themePreviewHalf} ${styles.themePreviewDark}`}>
                                                <div
                                                    className={styles.themePreviewBar}
                                                    style={{ background: activeAccent, width: "40%" }}
                                                />
                                                <div
                                                    className={styles.themePreviewBar}
                                                    style={{ background: "#3a3d44", width: "75%" }}
                                                />
                                                <div
                                                    className={styles.themePreviewBar}
                                                    style={{ background: "#3a3d44", width: "55%" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.themeCardFooter}>
                                        <span className={`${styles.themeRadio} ${active ? styles.themeRadioActive : ""}`} />
                                        <Icon size={14} />
                                        {label}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
