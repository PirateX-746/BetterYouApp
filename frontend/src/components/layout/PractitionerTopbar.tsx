import { cookies } from "next/headers";
import { logout } from "@/app/actions/logout";
import { Button } from "../ui/button";
import { CustomButton } from "../customComponents/CustomButton";

export default async function PractitionerTopbar() {
  const cookieStore = await cookies();
  const doctorName = cookieStore.get("name")?.value;

  return (
    <header className="fixed top-0 left-64 z-30 w-[calc(100%-16rem)] bg-bg-card border-b border-border flex items-center justify-end px-6 py-3 gap-4">
      {/* Doctor Name */}
      <span className="text-text-secondary text-sm">
        Dr. {doctorName ? decodeURIComponent(doctorName) : "Doctor"}
      </span>

      {/* Logout Button */}
      <form action={logout}>
        <CustomButton customVariant="logout" type="submit">
          Logout
        </CustomButton>
      </form>
    </header>
  );
}
