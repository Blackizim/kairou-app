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
        bg: '#0b0e15',
        surface: '#121824',
        text: '#f4f6fb',
        muted: '#8591a7',
        blue: '#bdd9ff',
        kairou: {
          void: '#0b0e15',
          surface1: '#0e141f',
          surface2: '#121824',
          surface3: '#172133',
          surface4: '#1a263b',
          borderSubtle: 'rgba(255, 255, 255, 0.08)',
          borderMedium: 'rgba(214, 232, 255, 0.16)',
          blueLight: '#bdd9ff',
          bluePrimary: '#75c8ff',
          blueHover: '#d3e6ff',
          ice: '#c9e1ff',
          textPrimary: '#f4f6fb',
          textSecondary: '#aeb6c5',
          textMuted: '#637892',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        manrope: ['"Manrope"', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
        'elevated': '0 12px 32px -4px rgba(0, 0, 0, 0.8)',
        'modal': '0 25px 100px rgba(0, 0, 0, 0.9)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'hero-drift': 'hero-drift 18s ease-out both',
        'glow': 'glow 8s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'hero-drift': {
          'from': { transform: 'scale(1.015)' },
          'to': { transform: 'scale(1.07) translateX(-0.3%)' }
        },
        'glow': {
          'from': { opacity: '0.4', transform: 'translateY(0)' },
          'to': { opacity: '1', transform: 'translateY(12px)' }
        }
      }
    },
  },
  plugins: [],
}
