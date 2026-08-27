/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-lime': '#00FF66',
        'neon-lime-dark': '#00D154',
        'neon-lime-light': '#54FF8E',
        'broker-black': '#0A0A0A',
        'broker-card': '#141414',
        'broker-card-light': '#202020',
        'broker-purple': '#2A0845',
        'broker-purple-light': '#491075',
        'broker-crimson': '#FF2247',
        'broker-crimson-dark': '#D91638',
        'broker-gold': '#FFD700',
        'broker-gold-light': '#FFE55C',
        'broker-gold-dark': '#C89600',
        'broker-cyan': '#00F0FF',
        'broker-white': '#FFFFFF',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'pixel-body': ['"Silkscreen"', 'monospace'],
        'pixel-alt': ['"VT323"', 'monospace'],
        'mono-code': ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px #000000',
        'pixel-sm': '2px 2px 0px 0px #000000',
        'pixel-lg': '6px 6px 0px 0px #000000',
        'pixel-xl': '8px 8px 0px 0px #000000',
        'pixel-gold': '4px 4px 0px 0px #C89600',
        'pixel-crimson': '4px 4px 0px 0px #880B1E',
        'pixel-white': '4px 4px 0px 0px #FFFFFF',
        'pixel-cyan': '4px 4px 0px 0px #0099A8',
        'pixel-lime': '4px 4px 0px 0px #00993D',
      }
    },
  },
  plugins: [],
}
