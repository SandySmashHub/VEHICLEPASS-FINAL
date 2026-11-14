/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#effaf3', 100: '#d8f3e1', 200: '#b3e6c6', 300: '#82d1a3', 400: '#4fb67e',
          500: '#2a9a60', 600: '#1c7c4c', 700: '#17633e', 800: '#154e34', 900: '#0f3d29', 950: '#082418',
        },
      },
    },
  },
  plugins: [],
};
