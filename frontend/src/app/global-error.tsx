"use client";

import "./globals.css";
import { CircleAlert } from "lucide-react";
import { StatusScreen } from "@/components/common/StatusScreen";
import { Button } from "@/components/ui/button";

/** Last resort when the root layout itself fails; it replaces <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <StatusScreen
          icon={<CircleAlert size={20} aria-hidden />}
          title="Something went wrong"
          message="BetterYou couldn't load. Please try again in a moment."
          actions={<Button onClick={reset}>Try again</Button>}
        />
      </body>
    </html>
  );
}
