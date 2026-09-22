import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/** A token that carries its own `soft` background and readable `foreground`. */
const statusScale = (name: string) => ({
  DEFAULT: `hsl(var(--${name}))`,
  soft: `hsl(var(--${name}-soft))`,
  foreground: `hsl(var(--${name}-foreground))`,
});

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        /* Body and UI. Replaces Inter: same legibility at 13–15px, without
           reading as the default every dashboard ships with. */
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        /* Page titles only. A variable optical-size serif — pair it with
           `.font-display` so it renders at the display master. */
        display: ["var(--font-display)", "Georgia", "serif"],
        /* Every clinical number: times, distances, dossier and licence keys,
           tariffs. Tabular by construction, so columns stop dancing. */
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      colors: {
        background: "hsl(var(--background))",
        /* The public side's warm sheet. `bg-paper` on marketing and annuaire
           pages, `bg-background` in the console. */
        paper: {
          DEFAULT: "hsl(var(--paper))",
          muted: "hsl(var(--paper-muted))",
        },
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
          "soft-foreground": "hsl(var(--primary-soft-foreground))",
        },
        /* The navigation rail: dark in both themes, so it cannot borrow the
           ink token (which inverts). */
        rail: {
          DEFAULT: "hsl(var(--rail))",
          foreground: "hsl(var(--rail-foreground))",
          muted: "hsl(var(--rail-muted))",
          border: "hsl(var(--rail-border))",
          raised: "hsl(var(--rail-raised))",
          admin: "hsl(var(--rail-admin))",
          "admin-raised": "hsl(var(--rail-admin-raised))",
          "admin-border": "hsl(var(--rail-admin-border))",
          "admin-muted": "hsl(var(--rail-admin-muted))",
        },
        /* Operator back-office only. Never used on a patient or practice
           surface, so "am I in the back-office?" is answered by colour. */
        clay: "hsl(var(--clay))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          warm: "hsl(var(--border-warm))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* Meaning, not hue. `bg-ok-soft text-ok-foreground` is one confirmed
           appointment whether it is rendered light or dark. */
        ok: statusScale("ok"),
        warn: statusScale("warn"),
        danger: statusScale("danger"),
        info: statusScale("info"),
        lab: statusScale("lab"),
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,30,27,0.06), 0 1px 2px rgba(15,30,27,0.04)",
        "card-hover": "0 6px 16px rgba(15,30,27,0.09), 0 2px 4px rgba(15,30,27,0.05)",
        modal: "0 24px 48px rgba(15,30,27,0.18), 0 8px 16px rgba(15,30,27,0.08)",
        glow: "0 0 0 3px hsl(var(--primary) / 0.15)",
        "inner-sm": "inset 0 1px 2px rgba(15,30,27,0.04)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "slide-up": "slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
