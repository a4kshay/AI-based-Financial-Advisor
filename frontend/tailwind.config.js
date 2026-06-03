/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0E14', // Deep dark blue-gray (Zerodha dark)
        surface: '#151A23',
        surfaceHover: '#1F2633',
        primary: '#2563EB', // Blue
        primaryHover: '#1D4ED8',
        success: '#10B981', // Green for profits
        successHover: '#059669',
        danger: '#EF4444',  // Red for losses
        dangerHover: '#DC2626',
        textPrimary: '#F3F4F6',
        textSecondary: '#9CA3AF',
        border: '#2A303C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
