import type { Config } from "tailwindcss";

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

        /* Backgrounds */
        bg: {
          page: v("--bg-page"),
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

      boxShadow: {
        sm: v("--shadow-sm"),
        md: v("--shadow-md"),
        lg: v("--shadow-lg"),
      },

      /* One corner radius for every component (6px, --radius-md): cards,
         buttons, inputs, dialogs. lg/xl/2xl/3xl all map to it so existing
         classes follow the design without touching each file. Pills and
         avatars keep rounded-full. Not wrapped in v(): that's for colors. */
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-md)",
        xl: "var(--radius-md)",
        "2xl": "var(--radius-md)",
        "3xl": "var(--radius-md)",
      },
    },
  },
  plugins: [],
};

export default config;
