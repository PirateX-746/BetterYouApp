import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one button for the app (see DESIGN_SYSTEM.md → Buttons).
 *
 *   primary      the single most important action in a context — one per view
 *   featured     gradient primary, for a hero CTA on a featured surface only
 *   secondary    neutral bordered action that sits beside a primary
 *   tertiary     tinted accent, for a prominent action that isn't the primary
 *   ghost        toolbar / low-emphasis actions, no chrome until hover
 *   destructive  solid red, only for the confirm step of a destructive action
 *   danger-ghost quiet red text, for "Delete"/"Cancel appointment" entry points
 *   link         inline text action
 *
 * `default` and `outline` remain as aliases of primary/secondary for older
 * call sites. Press feedback (scale 0.97) comes from the global rule in
 * globals.css; this only adds `transform` to the transition list.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer select-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-card disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-brand hover:bg-primary-hover active:bg-primary-pressed",
        default: "bg-primary text-white shadow-brand hover:bg-primary-hover active:bg-primary-pressed",
        featured: "bg-brand text-white shadow-brand hover:brightness-110 active:brightness-95",
        /* For use ON a featured (blue) surface: a white button with brand text. */
        "on-brand": "bg-white text-primary-strong shadow-xs hover:bg-white/90",
        secondary: "border border-border bg-bg-card text-text-primary shadow-xs hover:bg-bg-hover",
        outline: "border border-border bg-bg-card text-text-primary shadow-xs hover:bg-bg-hover",
        tertiary: "bg-primary/10 text-primary-strong hover:bg-primary/15 active:bg-primary/20",
        ghost: "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
        destructive: "bg-danger text-white shadow-xs hover:bg-danger/90",
        "danger-ghost": "text-danger-strong hover:bg-danger/10",
        link: "h-auto px-0 text-primary-strong underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-footnote",
        default: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Prepends a spinner and disables the button. Omit your own leading icon while loading. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
