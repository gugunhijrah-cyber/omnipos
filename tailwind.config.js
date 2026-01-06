/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: "#4F46E5",
        secondary: "#10B981",
        dark: "#1E1E2E",
        paper: "#FFFFFF",
        danger: "#EF4444",
      },
    },
  },
  plugins: [],
}