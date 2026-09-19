/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta Savey
        primary: {
          DEFAULT: '#10B981',  // Growth — CTA principal
          dark: '#0F3D32',     // Evergreen — hover, headings dark
        },
        mint: '#DFF7EB',       // Mint — backgrounds sutis, highlights
        charcoal: '#1F2937',   // Charcoal — dark mode surface
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}
