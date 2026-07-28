/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // Paleta "Slate & Navy" tomada del mockup Stitch (stitch_signage_os_enterprise/signageflow_precision_system/DESIGN.md)
        surface: "#f8fafc",
        "surface-container": "#ffffff",
        "surface-container-high": "#f1f5f9",
        border: "#e2e8f0",
        "on-surface": "#0f172a",
        "on-surface-variant": "#475569",
        primary: "#0f172a",
        "on-primary": "#ffffff",
        accent: "#4f46e5",
        "on-accent": "#ffffff",
        success: "#10b981",
        "success-container": "#d1fae5",
        "on-success-container": "#065f46",
        warning: "#f59e0b",
        "warning-container": "#fef3c7",
        "on-warning-container": "#92400e",
        danger: "#f43f5e",
        "danger-container": "#ffe4e6",
        "on-danger-container": "#9f1239",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
      spacing: {
        sidebar: "240px",
        drawer: "480px",
      },
      boxShadow: {
        popover: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};
