/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'aurora-border': {
          '0%, 100%': { transform: 'translateX(-50%)' },
          '50%': { transform: 'translateX(50%)' },
        },
        'aurora1': {
          '0%, 100%': { transform: 'translateX(-50%) translateY(-10%)' },
          '50%': { transform: 'translateX(50%) translateY(10%)' },
        },
        'aurora2': {
          '0%, 100%': { transform: 'translateX(50%) translateY(-10%)' },
          '50%': { transform: 'translateX(-50%) translateY(10%)' },
        },
        'aurora3': {
          '0%, 100%': { transform: 'translateX(-50%) translateY(10%)' },
          '50%': { transform: 'translateX(50%) translateY(-10%)' },
        },
        'aurora4': {
          '0%, 100%': { transform: 'translateX(50%) translateY(10%)' },
          '50%': { transform: 'translateX(-50%) translateY(-10%)' },
        },
        'aurora-text': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'aurora1': 'aurora-border 6s ease-in-out infinite, aurora1 12s ease-in-out infinite alternate',
        'aurora2': 'aurora-border 6s ease-in-out infinite, aurora2 12s ease-in-out infinite alternate',
        'aurora3': 'aurora-border 6s ease-in-out infinite, aurora3 12s ease-in-out infinite alternate',
        'aurora4': 'aurora-border 6s ease-in-out infinite, aurora4 12s ease-in-out infinite alternate',
        'aurora-text': 'aurora-text 10s linear infinite',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
      },
      transitionDelay: {
        '200': '200ms',
        '300': '300ms',
      }
    },
  },
  plugins: [],
}
