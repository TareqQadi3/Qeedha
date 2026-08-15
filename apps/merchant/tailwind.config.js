/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0E5F58',
          dark: '#0a4842',
        },
        accent: {
          DEFAULT: '#F5A623',
        },
      },
      fontFamily: {
        sans: ['"Tajawal"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};