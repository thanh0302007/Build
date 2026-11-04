/** @type {import('tailwindcss').Config} */
// Hệ thống màu Cozy dựa trên biến CSS RGB (hỗ trợ đầy đủ opacity /20, /30 và chuyển đổi Chủ đề)
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cozy: {
          bg: 'rgb(var(--cozy-bg) / <alpha-value>)',
          card: 'rgb(var(--cozy-card) / <alpha-value>)',
          blush: 'rgb(var(--cozy-blush) / <alpha-value>)',
          peach: 'rgb(var(--cozy-peach) / <alpha-value>)',
          accent: 'rgb(var(--cozy-peach-dark) / <alpha-value>)',
          matcha: 'rgb(var(--cozy-matcha) / <alpha-value>)',
          lavender: 'rgb(var(--cozy-lavender) / <alpha-value>)',
          butter: 'rgb(var(--cozy-butter) / <alpha-value>)',
          text: 'rgb(var(--cozy-text) / <alpha-value>)',
          muted: 'rgb(var(--cozy-muted) / <alpha-value>)',
          line: 'rgb(var(--cozy-line) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Quicksand', 'Nunito', 'sans-serif'],
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.18s ease-out',
        floaty: 'floaty 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
