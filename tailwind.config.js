/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04050B",
          900: "#070912",
          850: "#0A0D1A",
          800: "#0E1222",
          700: "#151A2E",
        },
        violet: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        verify: "#34D399",
        alarm: "#F87171",
        amber: "#FBBF24",
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', "Consolas", '"Courier New"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,.28), 0 18px 48px -18px rgba(124,58,237,.55)",
        soft: "0 24px 60px -30px rgba(0,0,0,.9)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-30%)" },
          "100%": { transform: "translateY(130%)" },
        },
        float: {
          "0%,100%": { transform: "translate3d(0,0,0)", opacity: ".35" },
          "50%": { transform: "translate3d(0,-18px,0)", opacity: ".7" },
        },
        pulseRing: {
          "0%": { transform: "scale(.85)", opacity: ".7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        sweep: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
      },
      animation: {
        scan: "scan 7s linear infinite",
        float: "float 9s ease-in-out infinite",
        pulseRing: "pulseRing 2.4s ease-out infinite",
        sweep: "sweep 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
