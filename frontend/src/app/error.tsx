"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { StatusScreen } from "@/components/common/StatusScreen";
import { Button } from "@/components/ui/button";

/** Any page that throws while rendering lands here instead of a blank screen. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={<CircleAlert size={20} aria-hidden />}
      title="Something went wrong"
      message="This page hit an unexpected problem. Please try again, and if it keeps happening, contact support."
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" asChild>
            <Link href="/">Go to home</Link>
          </Button>
        </>
      }
    />
  );
}
