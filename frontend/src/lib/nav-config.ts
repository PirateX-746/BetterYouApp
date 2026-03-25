// lib/nav-config.ts
// Single source of truth for all patient navigation items.
// Update this file whenever routes change — all nav components consume it.

import { Home, Calendar, MessageCircle, User, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export const PATIENT_NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/patient/home", icon: Home },
  { name: "Appointments", href: "/patient/appointments", icon: Calendar },
  { name: "Messages", href: "/patient/messages", icon: MessageCircle },
  { name: "Profile", href: "/patient/profile", icon: User },
  { name: "Settings", href: "/patient/settings", icon: Settings },
];

// Matches a specific message conversation, e.g. /patient/messages/abc123
// Used by PatientLayout to suppress the bottom nav inside chat threads.
export const HIDE_BOTTOM_NAV_PATTERN = /\/messages\/[^/]+$/;
