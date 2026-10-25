"use client";

import { useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { X } from "lucide-react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class for the desktop dialog, e.g. "sm:max-w-lg". */
  maxWidth?: string;
}

/**
 * Critically damped (no overshoot). A modal opened by a tap carries no
 * momentum, so it settles rather than bounces.
 */
const SPRING = { type: "spring", bounce: 0, duration: 0.35 } as const;
const FADE = { duration: 0.2, ease: "easeOut" } as const;

/** Where a flick would come to rest — Apple's scroll-deceleration projection. */
function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

const desktopQuery = "(min-width: 640px)";
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(desktopQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
}

/**
 * One modal shell for the whole app: bottom sheet on mobile, centered
 * dialog on desktop, Esc-to-close, click-outside-to-close, scrollable body
 * capped at 92dvh. Every custom (non-Radix) modal should be built from
 * this rather than reimplementing the overlay/backdrop/close-button
 * boilerplate — that's how the Esc-key bug happened in the first place:
 * four near-identical modals, each with its own copy to forget.
 *
 * Motion follows the apple-design skill: springs that start from the live
 * on-screen value (so reopening mid-close just reverses), symmetric
 * enter/exit paths, and on mobile a sheet that can be dragged down from its
 * header and flicked away. Reduced motion falls back to a cross-fade.
 */
const noopSubscribe = () => () => {};

export function Modal(props: ModalProps) {
  useEscapeToClose(props.open, props.onClose);
  // Portal to <body>: rendered in place, a parent's space-y-* margin shifted
  // this fixed overlay down (a strip of un-dimmed page showed above it), and
  // any transformed ancestor would re-anchor it.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {props.open && <ModalPanel key="modal" {...props} />}
    </AnimatePresence>,
    document.body,
  );
}

function ModalPanel({
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "sm:max-w-lg",
}: ModalProps) {
  const titleId = useId();
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();
  // While exiting, let clicks fall through instead of blocking the page.
  const isPresent = useIsPresent();

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  // Backdrop lightens continuously as the sheet is pulled down.
  const backdropOpacity = useTransform(y, [0, 400], [1, 0.3]);
  const draggable = !isDesktop;

  const offscreen = typeof window === "undefined" ? 1000 : window.innerHeight;
  const hidden = reduceMotion
    ? { opacity: 0 }
    : isDesktop
      ? { opacity: 0, scale: 0.96, y: 8 }
      : { y: offscreen };
  const shown = reduceMotion
    ? { opacity: 1 }
    : isDesktop
      ? { opacity: 1, scale: 1, y: 0 }
      : { y: 0 };

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const height = sheetRef.current?.offsetHeight ?? offscreen;
    const restingPoint = y.get() + project(info.velocity.y);
    if (restingPoint > height * 0.4) {
      onClose();
    } else {
      animate(y, 0, { ...SPRING, velocity: info.velocity.y });
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 ${
        isPresent ? "" : "pointer-events-none"
      }`}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={FADE}
      >
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          style={{ opacity: backdropOpacity }}
          onClick={onClose}
        />
      </motion.div>
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${maxWidth} bg-bg-card rounded-t-3xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col max-h-[92dvh] pb-safe-b sm:pb-0`}
        style={{ y }}
        initial={hidden}
        animate={shown}
        exit={hidden}
        transition={reduceMotion ? FADE : SPRING}
        drag={draggable ? "y" : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle + header are the grab area, so the body can still scroll. */}
        <div
          className="touch-none sm:touch-auto shrink-0"
          onPointerDown={(e) => draggable && dragControls.start(e)}
        >
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3.5 border-b border-border-light">
            <div className="min-w-0">
              <h2 id={titleId} className="text-title-3 font-semibold text-text-primary">{title}</h2>
              {subtitle && (
                <p className="text-footnote text-text-secondary mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-bg-hover/70 hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {children}
        </div>

        {footer && (
          <div className="flex items-center gap-3 px-5 py-3.5 border-t border-border-light bg-bg-subtle shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
