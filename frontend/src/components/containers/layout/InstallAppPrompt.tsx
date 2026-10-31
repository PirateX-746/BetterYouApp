"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Share, SquarePlus, Stethoscope, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Chrome/Edge/Samsung Internet fire this when the app can be installed. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "installPromptDismissedAt";
const DISMISS_DAYS = 30;
/** Pages where a banner would be noise: the marketing site. */
const HIDDEN_ON = new Set(["/"]);

const SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for a home-screen launch.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points tell them apart.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Invites phone and tablet users to install the portal to their home screen.
 * Android/Chromium gets a one-tap Install button; iOS/iPadOS has no install
 * API, so it shows the Share → Add to Home Screen steps instead. Hidden once
 * installed, on desktop (fine pointer), and for 30 days after "Not now".
 */
const noSubscribe = () => () => {};

/** Phone or tablet, in a browser tab, and not dismissed recently. Read once on the client. */
function canOffer() {
  return window.matchMedia("(pointer: coarse)").matches && !isStandalone() && !recentlyDismissed();
}

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const eligible = useSyncExternalStore(noSubscribe, canOffer, () => false);
  const ios = useSyncExternalStore(noSubscribe, isIos, () => false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);

  // iOS/iPadOS has no install event; elsewhere wait for the browser to offer one.
  useEffect(() => {
    if (!eligible || ios) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setClosed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [eligible, ios]);

  const mode = !eligible || closed ? null : ios ? "ios" : installEvent ? "install" : null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: the banner just comes back next visit.
    }
    setClosed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setClosed(true);
    else dismiss();
  };

  const visible = mode !== null && !HIDDEN_ON.has(pathname);
  const offscreen = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-labelledby="install-app-title"
          initial={offscreen}
          animate={{ opacity: 1, y: 0 }}
          exit={offscreen}
          transition={reduceMotion ? { duration: 0.2 } : SPRING}
          // Sits above the portal's bottom nav (4rem) and the home indicator.
          className="fixed z-50 left-4 right-4 sm:left-auto sm:w-96 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 bg-bg-card rounded-2xl shadow-lg border border-border-light p-4"
        >
          <div className="flex items-start gap-3">
            <span className="size-10 shrink-0 rounded-xl bg-brand text-white grid place-items-center shadow-brand">
              <Stethoscope size={20} aria-hidden />
            </span>

            <div className="flex-1 min-w-0">
              <h2 id="install-app-title" className="text-body font-semibold text-text-primary">
                Install BetterYou
              </h2>
              {mode === "ios" ? (
                <p className="text-footnote text-text-secondary mt-0.5">
                  Tap <Share size={14} className="inline -mt-0.5 text-primary-strong" aria-label="Share" /> then{" "}
                  <span className="font-medium text-text-primary whitespace-nowrap">
                    Add to Home Screen <SquarePlus size={14} className="inline -mt-0.5" aria-hidden />
                  </span>{" "}
                  for full-screen, app-like access.
                </p>
              ) : (
                <p className="text-footnote text-text-secondary mt-0.5">
                  Add it to your home screen for full-screen, app-like access.
                </p>
              )}
            </div>

            <Button variant="ghost" size="icon-sm" className="-mr-1 -mt-1 shrink-0" onClick={dismiss} aria-label="Dismiss">
              <X />
            </Button>
          </div>

          {mode === "install" && (
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="secondary" size="sm" onClick={dismiss}>
                Not now
              </Button>
              <Button size="sm" onClick={install}>
                Install
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
