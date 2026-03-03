/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#F5F5F7',
          text: '#1D1D1F',
          blue: '#0071E3',
          card: 'rgba(255, 255, 255, 0.8)',
        }
      },
    },
  },
  plugins: [],
}