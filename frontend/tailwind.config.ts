import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * A theme color backed by a CSS variable that still supports Tailwind's
 * opacity modifiers. A bare "var(--primary)" can't take an alpha, so classes
 * like `bg-primary/10` or `focus:ring-primary/40` silently generated nothing —
 * including every focus ring written that way. color-mix applies the alpha to
 * any color format, including the accent ThemeProvider sets at runtime.
 */
const v = (name: string) =>
  `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Shadcn-compatible */
        background: v("--background"),
        foreground: v("--foreground"),
        card: {
          DEFAULT: v("--card"),
          foreground: v("--card-foreground"),
        },
        popover: {
          DEFAULT: v("--popover"),
          foreground: v("--popover-foreground"),
        },
        secondary: {
          DEFAULT: v("--secondary"),
          foreground: v("--secondary-foreground"),
        },
        muted: {
          DEFAULT: v("--muted"),
          foreground: v("--muted-foreground"),
        },
        accent: {
          DEFAULT: v("--accent"),
          foreground: v("--accent-foreground"),
        },
        destructive: {
          DEFAULT: v("--destructive"),
          foreground: v("--destructive-foreground"),
        },
        ring: v("--ring"),
        input: v("--input"),

        /* Brand */
        primary: {
          DEFAULT: v("--primary"),
          foreground: v("--primary-foreground"),
          light: v("--primary-light"),
          hover: v("--primary-hover"),
          /* Accent darkened for text on tinted fills (badges, selected tabs) — AA contrast. */
          strong: v("--primary-strong"),
          pressed: v("--primary-pressed"),
          /* Faintest tint — quiet featured areas, selected rows. */
          subtle: v("--primary-subtle"),
        },
        info: {
          DEFAULT: v("--info"),
          light: v("--info-light"),
          strong: v("--info-strong"),
        },

        /* Status */
        success: v("--success"),
        "success-light": v("--success-light"),
        warning: v("--warning"),
        "warning-light": v("--warning-light"),
        danger: v("--danger"),
        "danger-light": v("--danger-light"),
        purple: v("--purple"),
        "purple-light": v("--purple-light"),
        teal: v("--teal"),
        "teal-light": v("--teal-light"),
        /* Text-safe status shades: use for status text/icons on a -light fill
           or on a card. The base status colors are for fills, dots and bars. */
        "success-strong": v("--success-strong"),
        "warning-strong": v("--warning-strong"),
        "danger-strong": v("--danger-strong"),
        "purple-strong": v("--purple-strong"),
        "teal-strong": v("--teal-strong"),

        /* Backgrounds */
        bg: {
          page: v("--bg-page"),
          /* Recessed surface inside a card: input wells, grouped rows, code. */
          subtle: v("--bg-subtle"),
          card: v("--bg-card"),
          light: v("--bg-light"),
          hover: v("--bg-hover"),
        },

        /* Text */
        text: {
          primary: v("--text-primary"),
          secondary: v("--text-secondary"),
          light: v("--text-light"),
          disabled: v("--text-disabled"),
        },

        /* Border */
        border: {
          DEFAULT: v("--border"),
          light: v("--border-light"),
        },
      },

      /* Shadows are whole box-shadow values, so they're plain var()s — the
         v() color-mix wrapper made every shadow-* class invalid CSS. */
      /* Featured surfaces only (see DESIGN_SYSTEM.md → Color → Gradients). */
      backgroundImage: {
        brand: "var(--gradient-brand)",
        "brand-soft": "var(--gradient-brand-soft)",
      },

      boxShadow: {
        brand: "var(--shadow-brand)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },

      /* Two radii (see DESIGN_SYSTEM.md): controls — buttons, inputs, menu
         items — are 8px (rounded-md/lg/xl); surfaces — cards, dialogs,
         popovers — are 12px (rounded-2xl/3xl). Existing classes map onto
         them so every file follows without edits. Pills/avatars: rounded-full. */
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-md)",
        xl: "var(--radius-md)",
        "2xl": "var(--radius-lg)",
        "3xl": "var(--radius-lg)",
      },

      /* Type scale (Apple-style: tracking tightens as size grows, leading
         loosens as size shrinks). Pair with a weight class. */
      fontSize: {
        "title-1": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.022em" }],
        "title-2": ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.016em" }],
        "title-3": ["1.0625rem", { lineHeight: "1.35", letterSpacing: "-0.01em" }],
        body: ["0.875rem", { lineHeight: "1.5", letterSpacing: "-0.003em" }],
        footnote: ["0.8125rem", { lineHeight: "1.45", letterSpacing: "0" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.003em" }],
        eyebrow: ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.06em" }],
      },

      transitionTimingFunction: {
        /* Apple's standard ease-out: fast start, long gentle settle. */
        apple: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
