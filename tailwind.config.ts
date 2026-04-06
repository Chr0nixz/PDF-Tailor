import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
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
        // Dark mode variants
        "ink-light": "#e6eef5",
        "mist-dark": "#121c28",
        "panel-dark": "#1a2636",
        "paper-dark": "#0f1923",
        "ember-dark": "#e8855f",
        "pine-dark": "#5ea996",
        "sky-dark": "#7ba8f5",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(24, 34, 48, 0.08)",
        "panel-dark": "0 18px 50px rgba(0, 0, 0, 0.3)",
      },
      fontFamily: {
        sans: ["Source Han Sans", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
