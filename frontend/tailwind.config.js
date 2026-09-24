/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4361ee", // The brand blue used in the new design
          light: "#f4f7fe", // The very light blue background of the app
          dark: "#1e293b", // Navy blue used in profile card
        },
        success: {
          DEFAULT: "#22c55e",
          light: "#dcfce7"
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fef3c7"
        },
        danger: {
          DEFAULT: "#ef4444",
          light: "#fee2e2"
        },
        info: {
          DEFAULT: "#0ea5e9",
          light: "#e0f2fe"
        },
        background: "#f4f7fe", // The distinct slightly blue-gray background from screenshot 1
        surface: "#ffffff",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'sm-soft': '0 2px 10px -2px rgba(0, 0, 0, 0.05)',
        'md-soft': '0 4px 20px -4px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
