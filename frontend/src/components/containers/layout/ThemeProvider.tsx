"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { darken, isValidHex } from "@/lib/color";

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

/** Pre-2026-10-19 default accent; see readAccent. */
const LEGACY_DEFAULT_ACCENT = "#5b8def";

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
    // --primary-light is derived from --primary in globals.css per theme; an
    // inline value here would pin the light tint in dark mode too.
    root.removeProperty("--primary-light");
    root.setProperty("--ring", hex);
    root.setProperty("--accent-foreground", hex);
}

/* Theme mode and accent live in localStorage; the OS preference in a media
 * query. Components read them through useSyncExternalStore so there is no
 * state to copy them into, and SSR/hydration sees the defaults. */
const DARK_QUERY = "(prefers-color-scheme: dark)";
const storeListeners = new Set<() => void>();

function notifyThemeStore() {
    storeListeners.forEach((l) => l());
}

function subscribeThemeStore(onChange: () => void) {
    storeListeners.add(onChange);
    const mq = window.matchMedia(DARK_QUERY);
    window.addEventListener("storage", onChange);
    mq.addEventListener("change", onChange);
    return () => {
        storeListeners.delete(onChange);
        window.removeEventListener("storage", onChange);
        mq.removeEventListener("change", onChange);
    };
}

function readThemeMode(): ThemeMode {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function readAccent(): string | null {
    const saved = localStorage.getItem("accentColor");
    // The old default blue was saved as an explicit choice by the
    // Appearance tab; treat it as "default" so it follows the new brand blue.
    return saved?.toLowerCase() === LEGACY_DEFAULT_ACCENT ? null : saved;
}

const readSystemDark = () => window.matchMedia(DARK_QUERY).matches;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const themeMode = useSyncExternalStore(subscribeThemeStore, readThemeMode, () => "system" as const);
    const accentColor = useSyncExternalStore(subscribeThemeStore, readAccent, () => null);
    const systemDark = useSyncExternalStore(subscribeThemeStore, readSystemDark, () => false);
    const darkMode = themeMode === "dark" || (themeMode === "system" && systemDark);

    // The inline script in the root layout applies the theme before
    // hydration; this fills in what it doesn't (--primary-hover) and drops
    // the legacy accent.
    useEffect(() => {
        if (localStorage.getItem("accentColor")?.toLowerCase() === LEGACY_DEFAULT_ACCENT) {
            localStorage.removeItem("accentColor");
        }
        document.documentElement.classList.toggle("dark", resolveDark(readThemeMode()));
        applyAccent(readAccent());
    }, []);

    // Follow OS theme changes live while in "system" mode.
    useEffect(() => {
        if (themeMode !== "system") return;
        const mq = window.matchMedia(DARK_QUERY);
        const handler = () => document.documentElement.classList.toggle("dark", mq.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [themeMode]);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        localStorage.setItem("theme", mode);
        document.documentElement.classList.toggle("dark", resolveDark(mode));
        notifyThemeStore();
    }, []);

    const toggleDarkMode = useCallback(() => {
        setThemeMode(darkMode ? "light" : "dark");
    }, [darkMode, setThemeMode]);

    const setAccentColor = useCallback((hex: string) => {
        localStorage.setItem("accentColor", hex);
        applyAccent(hex);
        notifyThemeStore();
    }, []);

    const resetAccentColor = useCallback(() => {
        localStorage.removeItem("accentColor");
        applyAccent(null);
        notifyThemeStore();
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
