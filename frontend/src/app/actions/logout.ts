"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  const cookieStore = await cookies();

  // token and role are HttpOnly (set by the API); name and userId are
  // display-only. Clear all four so no stale identity survives logout.
  cookieStore.delete("token");
  cookieStore.delete("role");
  cookieStore.delete("name");
  cookieStore.delete("userId");

  redirect("/");
}
