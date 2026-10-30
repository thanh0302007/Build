/** @type {import('tailwindcss').Config} */
// Bảng màu Cozy Pastel chuẩn theo PROJECT_RULES.md (mục I.4)
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cozy: {
          bg: '#FDFBF7', // Nền chính - Kem ấm
          card: '#FFFFFF', // Nền thẻ - Trắng sữa
          blush: '#FFF9F9', // Nền thẻ - Hồng phấn nhạt
          peach: '#F4ACB7', // Primary - Hồng đào
          matcha: '#A3C9A8', // Secondary - Xanh Matcha
          lavender: '#E2D4F0', // Accent - Tím Oải hương
          butter: '#FFF3B0', // Accent - Vàng bơ
          text: '#4A4A4A', // Chữ chính
          muted: '#8E8A86', // Chữ phụ
          line: '#F0EAE1', // Viền mảnh
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
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.22s ease-out',
        floaty: 'floaty 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

