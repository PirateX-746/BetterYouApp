"use client";

import { Menu, LogOut } from "lucide-react";
import { logout } from "@/app/actions/logout";
import { CustomButton } from "@/components/customComponents/CustomButton";
import ThemeToggle from "./ThemeToggle";
import { useEffect, useState } from "react";

interface TopbarProps {
  open: boolean;
  onToggle: () => void;
}


export default function PractitionerTopbar({
  open,
  onToggle,
}: TopbarProps) {
  const [doctorName, setDoctorName] = useState<string>("Doctor");

  // Read cookie on client
  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("name="));

    if (match) {
      const value = decodeURIComponent(match.split("=")[1]);
      setDoctorName(value);
    }
  }, []);

  return (
    <header
      className={`
    fixed top-0 z-30 h-14 bg-bg-card border-b border-border
    flex items-center justify-between px-6
    w-full
    lg:left-64 lg:w-[calc(100%-16rem)]
  `}
    >
      {/* Left Section */}
      <button
        onClick={onToggle}
        className="p-2 rounded-md hover:bg-bg-hover transition"
      >
        <Menu size={20} className="lg:hidden" />
      </button>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        <ThemeToggle />

        {/* Doctor Name */}
        <span className="text-text-secondary text-sm">
          Dr. {doctorName}
        </span>

        {/* Logout */}
        <form action={logout}>
          <CustomButton customVariant="logout" type="submit">
            <LogOut size={16} />
            <span className="ml-2 lg:block hidden">Logout</span>
          </CustomButton>
        </form>
      </div>
    </header>
  );
}
