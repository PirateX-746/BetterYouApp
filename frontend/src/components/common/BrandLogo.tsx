import { Stethoscope } from "lucide-react";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { tile: string; icon: number; text: string }> = {
  sm: { tile: "size-7 rounded-lg", icon: 15, text: "text-title-3" },
  md: { tile: "size-9 rounded-xl", icon: 20, text: "text-xl" },
  lg: { tile: "size-14 rounded-2xl", icon: 28, text: "text-2xl tracking-tight" },
};

interface BrandLogoProps {
  /** sm: sidebars/topbars · md: lock screen, small cards · lg: auth pages. */
  size?: Size;
  /** Tile above the wordmark (auth pages) instead of beside it. */
  stacked?: boolean;
  /** White wordmark for dark surfaces. */
  inverse?: boolean;
  /** Render the wordmark as the page's h1 (auth pages). */
  asHeading?: boolean;
  className?: string;
}

/**
 * The one BetterYou logo: the stethoscope on a brand tile (the same mark as
 * the app icon, see app/icons/[name]/route.tsx) and the "Better" + "You"
 * wordmark with "Better" in brand blue. Use this everywhere the brand
 * appears instead of hand-building it.
 */
export function BrandLogo({
  size = "sm",
  stacked = false,
  inverse = false,
  asHeading = false,
  className = "",
}: BrandLogoProps) {
  const s = SIZES[size];
  const Wordmark = asHeading ? "h1" : "span";
  return (
    <span
      className={`inline-flex items-center ${stacked ? "flex-col gap-3" : "gap-2.5"} ${className}`}
    >
      <span
        className={`${s.tile} bg-brand text-white grid place-items-center shadow-brand shrink-0`}
      >
        <Stethoscope size={s.icon} aria-hidden />
      </span>
      <Wordmark
        className={`${s.text} font-semibold ${inverse ? "text-white" : "text-text-primary"}`}
      >
        <span className="text-primary">Better</span>You
      </Wordmark>
    </span>
  );
}
