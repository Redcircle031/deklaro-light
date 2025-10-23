import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2863FF",
          50: "#EDF3FF",
          100: "#D6E5FF",
          200: "#ACC7FF",
          300: "#82A8FF",
          400: "#598AFF",
          500: "#2863FF",
          600: "#1E4CC6",
          700: "#153690",
          800: "#0B205A",
          900: "#040A24"
        },
        slate: {
          950: "#0B1020"
        }
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Menlo", "monospace"]
      },
      boxShadow: {
        card: "0 12px 40px -24px rgba(40, 99, 255, 0.5)"
      },
      borderRadius: {
        xl: "1rem"
      }
    }
  },
  plugins: []
};

export default config;
