import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        /* ── Design system tokens ───────────────── */
        "bg-page":       "var(--bg-page)",
        "bg-card":       "var(--bg-card)",
        "dp-border":     "var(--border)",
        "text-primary":  "var(--text-primary)",
        "text-secondary":"var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "dp-accent":     "var(--accent)",
        "accent-hover":  "var(--accent-hover)",
        "accent-light":  "var(--accent-light)",
        "dp-success":    "var(--success)",
        "dp-warning":    "var(--warning)",
        "dp-danger":     "var(--danger)",

        /* ── Sidebar (rgb triplets → /opacity support) ── */
        "sidebar":                   "rgb(var(--sidebar) / <alpha-value>)",
        "sidebar-border":            "rgb(var(--sidebar-border) / <alpha-value>)",
        "sidebar-foreground":        "rgb(var(--sidebar-foreground) / <alpha-value>)",
        "sidebar-foreground-active": "rgb(var(--sidebar-foreground-active) / <alpha-value>)",

        /* ── shadcn/ui compatibility ────────────── */
        border:      "var(--border)",
        input:       "var(--input)",
        ring:        "var(--ring)",
        background:  "var(--background)",
        foreground:  "var(--foreground)",
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent-ui)",
          foreground: "var(--accent-ui-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg:  "12px",
        md:  "8px",
        sm:  "6px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
