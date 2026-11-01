"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether the desktop/iPad sidebar is collapsed to an icon rail. Applies at
 * the lg breakpoint and up only; below that the sidebar is a drawer. Kept in
 * localStorage so the choice survives reloads, and shared across components
 * (sidebar, topbar, layout) through a window event.
 */
const KEY = "ui.sidebarCollapsed";
const EVENT = "ui:sidebar-collapsed";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Fallback when storage is blocked, so the toggle still works this visit. */
let memory = false;

function read(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? memory : v === "1";
  } catch {
    return memory;
  }
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => {
    memory = !read();
    try {
      localStorage.setItem(KEY, memory ? "1" : "0");
    } catch {
      /* storage unavailable — kept in memory for this visit */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [collapsed, toggle];
}
