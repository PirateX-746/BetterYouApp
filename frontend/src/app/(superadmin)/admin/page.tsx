import { redirect } from "next/navigation";

// /admin is the console root; the dashboard is its landing screen.
export default function AdminIndex() {
  redirect("/admin/dashboard");
}
