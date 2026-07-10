/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1e3a5f',
          mid:  '#2e6da4',
        },
      },
    },
  },
  plugins: [],
}

