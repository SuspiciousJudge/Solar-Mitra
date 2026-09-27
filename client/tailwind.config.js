/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans Variable"',
          '"Noto Sans Devanagari"',
          '"Noto Sans Gujarati"',
          '"Noto Sans Tamil"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        forest: {
          50: '#effaf3',
          100: '#d8f3e1',
          200: '#b3e5c7',
          300: '#7fd0a5',
          400: '#49b47f',
          500: '#259862',
          600: '#177a4e',
          700: '#136241',
          800: '#124e36',
          900: '#0f402e',
          950: '#07241a',
        },
        solar: {
          50: '#fffbeb',
          100: '#fff3c6',
          200: '#ffe588',
          300: '#ffd24a',
          400: '#ffbf20',
          500: '#f99d07',
          600: '#dd7502',
          700: '#b75106',
          800: '#943e0c',
          900: '#7a340d',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px -4px rgba(16, 24, 40, 0.08)',
        lift: '0 12px 32px -12px rgba(15, 64, 46, 0.25)',
        phone: '0 40px 80px -24px rgba(7, 36, 26, 0.35), 0 0 0 1px rgba(7, 36, 26, 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
      },
    },
  },
  plugins: [],
};
