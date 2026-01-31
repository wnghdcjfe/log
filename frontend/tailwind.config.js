/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        serif: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      colors: {
        peach: {
          main: '#FFDAB9',
          accent: '#FFB6A3',
          bg: '#FFF9F5',
          text: '#8b6355',
          title: '#e89580',
        },
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}
