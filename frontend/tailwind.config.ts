import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Shadcn-compatible */
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        ring: "var(--ring)",
        input: "var(--input)",

        /* Brand */
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          light: "var(--primary-light)",
          hover: "var(--primary-hover)",
        },

        /* Status */
        success: "var(--success)",
        "success-light": "var(--success-light)",
        warning: "var(--warning)",
        "warning-light": "var(--warning-light)",
        danger: "var(--danger)",
        purple: "var(--purple)",
        "purple-light": "var(--purple-light)",

        /* Backgrounds */
        bg: {
          page: "var(--bg-page)",
          card: "var(--bg-card)",
          light: "var(--bg-light)",
          hover: "var(--bg-hover)",
        },

        /* Text */
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          light: "var(--text-light)",
          disabled: "var(--text-disabled)",
        },

        /* Border */
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
