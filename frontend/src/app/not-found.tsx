import Link from "next/link";
import { Compass } from "lucide-react";
import { StatusScreen } from "@/components/common/StatusScreen";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusScreen
      icon={<Compass size={20} aria-hidden />}
      title="Page not found"
      message="This page doesn't exist or has moved. Check the address, or head back to the start."
      actions={
        <Button asChild>
          <Link href="/">Go to home</Link>
        </Button>
      }
    />
  );
}
