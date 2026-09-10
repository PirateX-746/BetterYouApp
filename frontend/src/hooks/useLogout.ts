// hooks/useLogout.ts
// Centralises the logout action with loading + error state.
// Import this wherever logout is needed instead of calling logout() directly.

"use client";

import { useTransition, useState } from "react";
import { logout } from "@/app/actions/logout";

export function useLogout() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLogout() {
    setError(null);
    startTransition(async () => {
      try {
        // Drop cached display data (name, role, userId) before the server
        // action clears the session cookies and redirects.
        try {
          localStorage.clear();
        } catch {
          /* storage unavailable — nothing cached to clear */
        }
        await logout();
      } catch (err) {
        console.error("Logout failed:", err);
        setError("Failed to log out. Please try again.");
      }
    });
  }

  return { handleLogout, isPending, error };
}
