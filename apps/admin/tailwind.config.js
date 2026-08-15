/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0E5F58',
        secondary: '#F5A623',
        text: '#1E293B',
      },
    },
  },
  plugins: [],
};
