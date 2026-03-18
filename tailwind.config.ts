import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // TWF Branding colors
        "twf": {
          green: "#00d084",
          blue: "#4f46e5",
          red: "#dc2626",
          orange: "#ea580c",
          "green-dark": "#00a86b",
          "blue-dark": "#4338ca",
        },
      },
      backgroundColor: {
        "surface": "var(--bg-surface)",
        "surface-secondary": "var(--bg-surface-secondary)",
      },
      textColor: {
        "primary": "var(--text-primary)",
        "secondary": "var(--text-secondary)",
      },
      borderColor: {
        "default": "var(--border-default)",
      },
    },
  },
  plugins: [forms],
};

export default config;
