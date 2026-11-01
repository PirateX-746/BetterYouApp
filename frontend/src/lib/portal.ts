/**
 * The platform console and the practice/patient portals keep separate
 * sessions (the API sets `admin_token` vs `token`), so one browser profile
 * can be signed in to both at once. This file holds the browser side of
 * that split: which portal the current page belongs to, and the console's
 * own display-data keys so it never overwrites the practice user's.
 */

/** Header the API reads to pick the console session on shared endpoints. */
export const PORTAL_HEADER = "X-Portal";

/** localStorage keys for the console's display data (never "name"/"userId"). */
export const ADMIN_STORAGE = {
  name: "admin.name",
  userId: "admin.userId",
} as const;

/** True on console pages, its sign-in pages, and the console's password change. */
export function isAdminPortal(): boolean {
  if (typeof window === "undefined") return false;
  const { pathname, search } = window.location;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/adminLogin") || pathname.startsWith("/adminForgotPassword")) return true;
  return pathname === "/change-password" && new URLSearchParams(search).get("portal") === "admin";
}

export function clearAdminSessionStorage() {
  for (const key of Object.values(ADMIN_STORAGE)) localStorage.removeItem(key);
}
