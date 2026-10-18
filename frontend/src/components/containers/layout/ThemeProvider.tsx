"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { darken, isValidHex, lighten } from "@/lib/color";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextType = {
    darkMode: boolean;
    toggleDarkMode: () => void;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    accentColor: string | null;
    setAccentColor: (hex: string) => void;
    resetAccentColor: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveDark(mode: ThemeMode): boolean {
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyAccent(hex: string | null) {
    const root = document.documentElement.style;
    if (!hex || !isValidHex(hex)) {
        root.removeProperty("--primary");
        root.removeProperty("--primary-hover");
        root.removeProperty("--primary-light");
        root.removeProperty("--ring");
        root.removeProperty("--accent-foreground");
        return;
    }
    root.setProperty("--primary", hex);
    root.setProperty("--primary-hover", darken(hex, 0.12));
    root.setProperty("--primary-light", lighten(hex, 0.85));
    root.setProperty("--ring", hex);
    root.setProperty("--accent-foreground", hex);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
    const [darkMode, setDarkMode] = useState(false);
    const [accentColor, setAccentColorState] = useState<string | null>(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const mode: ThemeMode =
            savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
                ? savedTheme
                : "system";
        setThemeModeState(mode);
        const isDark = resolveDark(mode);
        setDarkMode(isDark);
        document.documentElement.classList.toggle("dark", isDark);

        const savedAccent = localStorage.getItem("accentColor");
        setAccentColorState(savedAccent);
        applyAccent(savedAccent);
    }, []);

    // Follow OS theme changes live while in "system" mode.
    useEffect(() => {
        if (themeMode !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            setDarkMode(mq.matches);
            document.documentElement.classList.toggle("dark", mq.matches);
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [themeMode]);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setThemeModeState(mode);
        localStorage.setItem("theme", mode);
        const isDark = resolveDark(mode);
        setDarkMode(isDark);
        document.documentElement.classList.toggle("dark", isDark);
    }, []);

    const toggleDarkMode = useCallback(() => {
        setThemeMode(darkMode ? "light" : "dark");
    }, [darkMode, setThemeMode]);

    const setAccentColor = useCallback((hex: string) => {
        setAccentColorState(hex);
        localStorage.setItem("accentColor", hex);
        applyAccent(hex);
    }, []);

    const resetAccentColor = useCallback(() => {
        setAccentColorState(null);
        localStorage.removeItem("accentColor");
        applyAccent(null);
    }, []);

    return (
        <ThemeContext.Provider
            value={{
                darkMode,
                toggleDarkMode,
                themeMode,
                setThemeMode,
                accentColor,
                setAccentColor,
                resetAccentColor,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used inside ThemeProvider");
    }
    return context;
}
