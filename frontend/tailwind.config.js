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
        cinema: {
          950: '#07090E',
          900: '#0C0E17',
          850: '#111522',
          800: '#171C2E',
          750: '#1F253C',
          700: '#2A324E',
          border: '#252C42',
          accent: '#6366F1',
          accentGlow: 'rgba(99, 102, 241, 0.25)',
          gold: '#F59E0B',
          emerald: '#10B981',
          rose: '#F43F5E',
          muted: '#94A3B8',
          text: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-accent': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        'glow-gold': '0 0 25px -5px rgba(245, 158, 11, 0.4)',
        'glow-card': '0 10px 30px -10px rgba(0, 0, 0, 0.7)',
      }
    },
  },
  plugins: [],
}
