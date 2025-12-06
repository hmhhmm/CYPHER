/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cypher: {
          bg: '#0A0A0A',
          surface: '#111111',
          accent: '#8A2BE2',
          'accent-glow': 'rgba(138, 43, 226, 0.6)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'bar-bounce': 'bar-bounce 0.5s ease-in-out infinite',
        'typewriter': 'typewriter 0.1s steps(1) forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'expand': 'expand 0.8s ease-out forwards',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(138, 43, 226, 0.7)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 0 10px rgba(138, 43, 226, 0)',
            transform: 'scale(1.05)'
          },
        },
        'glow': {
          '0%': { boxShadow: '0 0 20px rgba(138, 43, 226, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(138, 43, 226, 0.8)' },
        },
        'bar-bounce': {
          '0%, 100%': { height: '10%' },
          '50%': { height: '100%' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'expand': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'cypher': '0 0 25px rgba(138, 43, 226, 0.6)',
        'cypher-lg': '0 0 40px rgba(138, 43, 226, 0.8)',
      }
    },
  },
  plugins: [],
}

