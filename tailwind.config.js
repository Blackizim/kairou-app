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
        kairou: {
          void: '#07090e',
          surface1: '#0d1117',
          surface2: '#131822',
          surface3: '#1a2230',
          surface4: '#242e40',
          borderSubtle: 'rgba(255, 255, 255, 0.07)',
          borderMedium: 'rgba(255, 255, 255, 0.14)',
          blueLight: '#38bdf8',
          bluePrimary: '#0ea5e9',
          blueHover: '#0284c7',
          ice: '#bae6fd',
          textPrimary: '#f8fafc',
          textSecondary: '#94a3b8',
          textMuted: '#64748b',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
        'elevated': '0 12px 32px -4px rgba(0, 0, 0, 0.8)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
        }
      }
    },
  },
  plugins: [],
}
