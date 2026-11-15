export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F97316',
          'orange-hover': '#EA580C',
          'orange-light': '#FFF7ED',
          black: '#000000',
          dark: '#111827',
          gray: '#4B5563',
          'light-gray': '#F3F4F6',
          border: '#000000',
          white: '#FFFFFF'
        }
      },
      fontFamily: {
        body: ['Arial', 'Helvetica', 'sans-serif'],
        heading: ['Calibri', 'Candara', 'Segoe', 'Segoe UI', 'sans-serif']
      },
      borderWidth: {
        DEFAULT: '1.5px',
        '1.5': '1.5px'
      }
    }
  },
  plugins: []
};
