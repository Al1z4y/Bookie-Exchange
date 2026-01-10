/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#a9c89d',
          50: '#f5f9f4',
          100: '#e8f2e5',
          200: '#d4e6cf',
          300: '#b5d3ad',
          400: '#a9c89d',
          500: '#8fb381',
          600: '#80b889',
          700: '#6a9a6f',
          800: '#567a5b',
          900: '#47644c',
        },
        secondary: {
          DEFAULT: '#a9c89d',
          50: '#f5f9f4',
          100: '#e8f2e5',
          200: '#d4e6cf',
          300: '#b5d3ad',
          400: '#a9c89d',
          500: '#8fb381',
          600: '#80b889',
          700: '#6a9a6f',
          800: '#567a5b',
          900: '#47644c',
        },
        accent: {
          DEFAULT: '#80b889',
          50: '#f0f7f2',
          100: '#dceee0',
          200: '#bddcc4',
          300: '#80b889',
          400: '#6ba576',
          500: '#5a8f64',
          600: '#4a7552',
          700: '#3e6044',
          800: '#344e39',
          900: '#2d4231',
        },
      },
    },
  },
  plugins: [],
}
