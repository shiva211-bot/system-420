import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#05010c",
        panel: "#0b0618",
        cyan: "#22f0ff",
        gold: "#f5c542",
        vio: "#b44cff",
        mag: "#ff2bd6",
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["Rajdhani", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        neon: "0 0 22px rgba(34,240,255,0.45), 0 0 48px rgba(180,76,255,0.25)",
        gold: "0 0 18px rgba(245,197,66,0.45)",
        mag: "0 0 22px rgba(255,43,214,0.4)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        gridShift: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "80px 80px" },
        },
        ken: {
          "0%": { transform: "scale(1) translate(0,0)" },
          "50%": { transform: "scale(1.08) translate(-1.5%, 1%)" },
          "100%": { transform: "scale(1) translate(0,0)" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        floaty: "floaty 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        gridShift: "gridShift 12s linear infinite",
        ken: "ken 28s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
