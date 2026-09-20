"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import PractitionerSidebar from "@/components/containers/layout/PractitionerSidebar";
import PractitionerTopbar from "@/components/containers/layout/PractitionerTopbar";
import { PractitionerUnreadProvider } from "@/contexts/PractitionerUnreadContext";
import { PortalLockProvider, usePortalLock } from "@/contexts/PortalLockContext";
import { PractitionerChatProvider, usePractitionerChat } from "@/contexts/PractitionerChatContext";
import { PractitionerNotificationsProvider } from "@/contexts/PractitionerNotificationsContext";
import { PractitionerBreadcrumbProvider } from "@/contexts/PractitionerBreadcrumbContext";
import { useLogout } from "@/hooks/useLogout";
import { Lock, Stethoscope } from "lucide-react";

const MAX_PIN_ATTEMPTS = 3;

type PinMode = "enter" | "set" | "confirm";

function PinBoxes({
  value,
  onChange,
  onKeyDown,
  inputRefs,
  autoFocus,
}: {
  value: string[];
  onChange: (index: number, val: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex justify-center gap-3">
      {value.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="w-12 h-14 text-center text-xl font-semibold rounded-xl border-2 outline-none transition bg-bg-page text-text-primary border-border focus:border-primary caret-transparent"
        />
      ))}
    </div>
  );
}

function LockOverlay() {
  const { unlock } = usePortalLock();
  const { handleLogout } = useLogout();

  const storedPin =
    typeof window !== "undefined" ? localStorage.getItem("portalPin") : null;

  const [mode, setMode] = useState<PinMode>(storedPin ? "enter" : "set");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [pendingPin, setPendingPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    setDigits(["", "", "", ""]);
    setError("");
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 60);
    return () => clearTimeout(t);
  }, [mode]);

  const handleComplete = (pin: string) => {
    if (mode === "enter") {
      const stored = localStorage.getItem("portalPin");
      if (pin === stored) {
        setAttempts(0);
        unlock();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setDigits(["", "", "", ""]);

        if (nextAttempts >= MAX_PIN_ATTEMPTS) {
          setError("Too many incorrect attempts. Logging out…");
          setLoggingOut(true);
          setTimeout(() => handleLogout(), 1000);
          return;
        }

        const remaining = MAX_PIN_ATTEMPTS - nextAttempts;
        setError(`Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`);
        setTimeout(() => inputRefs.current[0]?.focus(), 60);
      }
    } else if (mode === "set") {
      setPendingPin(pin);
      setMode("confirm");
    } else {
      if (pin === pendingPin) {
        localStorage.setItem("portalPin", pin);
        unlock();
      } else {
        setError("PINs don't match. Try again.");
        setPendingPin("");
        setMode("set");
      }
    }
  };

  const handleChange = (index: number, raw: string) => {
    const val = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    if (val && index < 3) inputRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) handleComplete(next.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const titles: Record<PinMode, string> = {
    enter: "Portal Locked",
    set: "Set Your PIN",
    confirm: "Confirm PIN",
  };
  const subtitles: Record<PinMode, string> = {
    enter: "Enter your 4-digit PIN to continue",
    set: "Choose a 4-digit PIN for quick access",
    confirm: "Re-enter the PIN to confirm",
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-page flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <Stethoscope size={22} className="text-primary" />
        <span className="text-xl font-semibold text-text-primary">
          <span className="text-primary">Better</span>You
        </span>
      </div>

      <div className="w-full max-w-xs bg-bg-card border border-border rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Lock size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">{titles[mode]}</h2>
          <p className="text-sm text-text-secondary mt-1">{subtitles[mode]}</p>
        </div>

        <div className="space-y-3">
          <fieldset disabled={loggingOut} className="space-y-3">
            <PinBoxes
              value={digits}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              inputRefs={inputRefs}
              autoFocus
            />
          </fieldset>
          {error && <p className="text-sm text-danger text-center">{error}</p>}
        </div>

        {mode === "enter" && (
          <p className="w-full text-xs text-text-secondary text-center">
            Forgot your PIN? Reset it from Settings → Security after signing back in.
          </p>
        )}
      </div>
    </div>
  );
}

function PractitionerLayoutInner({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isLocked } = usePortalLock();
  const { chatOpen } = usePractitionerChat();
  const isMessages = pathname === "/messages";

  // On mobile, when chat is open: no topbar/bottom-nav offset. On desktop always pt-14.
  const mainClass = isMessages
    ? chatOpen
      ? "flex-1 min-h-0 flex flex-col overflow-hidden md:pt-14"
      : "flex-1 min-h-0 flex flex-col overflow-hidden pt-14 pb-16 lg:pb-0"
    : "flex-1 min-h-0 pt-14 pb-16 lg:pb-0 overflow-y-auto overflow-x-hidden";

  return (
    <>
      <PractitionerSidebar open={open} setOpen={setOpen} />

      <div className="lg:ml-64 h-screen bg-bg-page flex flex-col overflow-hidden">
        <PractitionerTopbar open={open} onToggle={() => setOpen((o) => !o)} />

        <main className={mainClass}>
          {isMessages ? (
            children
          ) : (
            <div className="p-4 md:p-6 w-full">{children}</div>
          )}
        </main>
      </div>

      {isLocked && <LockOverlay />}
    </>
  );
}

export default function PractitionerLayout({ children }: { children: ReactNode }) {
  return (
    <PortalLockProvider>
      <PractitionerChatProvider>
        <PractitionerUnreadProvider>
          <PractitionerNotificationsProvider>
            <PractitionerBreadcrumbProvider>
              <PractitionerLayoutInner>{children}</PractitionerLayoutInner>
            </PractitionerBreadcrumbProvider>
          </PractitionerNotificationsProvider>
        </PractitionerUnreadProvider>
      </PractitionerChatProvider>
    </PortalLockProvider>
  );
}
