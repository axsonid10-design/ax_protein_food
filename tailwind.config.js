/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#991b1b',
          container: '#450a0a',
          'on-container': '#fecaca',
          dark: '#7f1d1d',
        },
        secondary: {
          DEFAULT: '#b91c1c',
          container: '#fee2e2',
          'on-container': '#991b1b',
          hover: '#991b1b',
        },
        burgundy: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        surface: {
          DEFAULT: '#f8fafc',
          dim: '#e2e8f0',
          bright: '#f8fafc',
          lowest: '#ffffff',
          low: '#f1f5f9',
          container: '#e2e8f0',
          high: '#cbd5e1',
          highest: '#94a3b8',
        },
        'on-surface': {
          DEFAULT: '#0f172a',
          variant: '#475569',
        },
        outline: {
          DEFAULT: '#94a3b8',
          variant: '#cbd5e1',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          'on-container': '#93000a',
        },
      },
      borderRadius: {
        pill: '9999px',
      },
      boxShadow: {
        level1: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
        level2: '0 4px 14px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
        level3: '0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
      }
    },
  },
  plugins: [],
}
