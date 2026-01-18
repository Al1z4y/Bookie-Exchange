/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cream background color
        cream: {
          DEFAULT: '#F6F0D7',
          50: '#FEFCF8',
          100: '#FDF9F1',
          200: '#FBF3E3',
          300: '#F9EDD5',
          400: '#F7E7C7',
          500: '#F6F0D7',
          600: '#E8DCC5',
          700: '#DAC8B3',
          800: '#CCB4A1',
          900: '#BEA08F',
        },
        // Green Color Palette
        primary: {
          DEFAULT: '#a9c89d',      // Primary green
          50: '#f5f9f4',
          100: '#e8f2e5',
          200: '#d4e6cf',
          300: '#b5d3ad',
          400: '#a9c89d',
          500: '#a9c89d',
          600: '#8fb381',
          700: '#6a9a6f',
          800: '#567a5b',
          900: '#47644c',
        },
        secondary: {
          DEFAULT: '#a9c89d',      // Secondary green (same as primary)
          50: '#f5f9f4',
          100: '#e8f2e5',
          200: '#d4e6cf',
          300: '#b5d3ad',
          400: '#a9c89d',
          500: '#a9c89d',
          600: '#8fb381',
          700: '#6a9a6f',
          800: '#567a5b',
          900: '#47644c',
        },
        accent: {
          DEFAULT: '#80b889',      // Accent green
          50: '#f0f7f2',
          100: '#dceee0',
          200: '#bddcc4',
          300: '#80b889',
          400: '#6ba576',
          500: '#80b889',
          600: '#6ba576',
          700: '#5a8f64',
          800: '#4a7552',
          900: '#3e6044',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
