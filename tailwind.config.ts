import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182230",
        mist: "#e6eef5",
        panel: "#f5f2ea",
        paper: "#fffdf8",
        ember: "#b85c38",
        pine: "#30524b",
        sky: "#5b8def",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(24, 34, 48, 0.08)",
      },
      fontFamily: {
        sans: ["Space Grotesk", "IBM Plex Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
