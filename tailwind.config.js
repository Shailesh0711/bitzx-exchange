/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        gold: {
          DEFAULT: '#9C7941',
          light:   '#EBD38D',
          dark:    '#7A5C2E',
        },
        surface: {
          DEFAULT: '#0d0f14',
          dark:    '#0a0b0d',
          card:    '#12141a',
          border:  '#1e2028',
          hover:   '#1a1d24',
        },
      },
      maxWidth: {
        '8xl':  '90rem',   /* 1440px */
        '9xl':  '110rem',  /* 1760px */
        '10xl': '120rem',  /* 1920px */
      },
      animation: {
        'ticker':   'ticker 30s linear infinite',
        'fade-up':  'fadeUp 0.6s ease both',
        'glow':     'glow 3s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 20px rgba(156,121,65,0.2)' },
          '50%':     { boxShadow: '0 0 50px rgba(156,121,65,0.5)' },
        },
        pulseGold: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
