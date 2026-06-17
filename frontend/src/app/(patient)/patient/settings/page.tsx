import { redirect } from "next/navigation";

// Settings are now integrated into the Profile page.
export default function SettingsRedirect() {
  redirect("/patient/profile");
}
