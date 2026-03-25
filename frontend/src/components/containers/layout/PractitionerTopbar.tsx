"use client";

import { Menu, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useEffect, useState } from "react";
import { useLogout } from "@/hooks/useLogout";

interface TopbarProps {
  open: boolean;
  onToggle: () => void;
}

export default function PractitionerTopbar({ open, onToggle }: TopbarProps) {
  const [doctorName, setDoctorName] = useState("User");
  const [role, setRole] = useState("");
  const { handleLogout, isPending } = useLogout();

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const nameCookie = cookies.find((r) => r.startsWith("name="));
    const roleCookie = cookies.find((r) => r.startsWith("role="));
    if (nameCookie) setDoctorName(decodeURIComponent(nameCookie.split("=")[1]));
    if (roleCookie)
      setRole(decodeURIComponent(roleCookie.split("=")[1]).toLowerCase());
  }, []);

  const displayName =
    role === "practitioner" ? `Dr. ${doctorName}` : doctorName;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 h-14 bg-bg-card border-b border-border flex items-center justify-between px-4">
      {/* Hamburger — mobile only */}
      <button
        onClick={onToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-bg-hover transition text-text-secondary"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Spacer on desktop so right side aligns */}
      <div className="hidden lg:block" />

      {/* Right */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        <span className="text-sm text-text-secondary hidden sm:block">
          {displayName}
        </span>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-danger/10 hover:text-danger transition disabled:opacity-50"
          aria-label="Log out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">
            {isPending ? "Logging out…" : "Logout"}
          </span>
        </button>
      </div>
    </header>
  );
}
