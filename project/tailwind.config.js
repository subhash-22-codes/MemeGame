/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        courier: ['Courier Prime', 'Courier', 'monospace'],
        monaco: ['Monaco', 'monospace'],
        handwritten: ['"Patrick Hand"', 'cursive'],
      },
    },
  },
  plugins: [],
};
