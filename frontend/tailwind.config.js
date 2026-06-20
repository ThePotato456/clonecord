/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          bg: '#36393f',
          sidebar: '#2f3136',
          channel: '#202225',
          hover: '#40444b',
          text: '#dcddde',
          muted: '#72767d',
          accent: '#5865f2',
          green: '#3ba55c',
          red: '#da373c',
          yellow: '#faa61a',
        },
      },
    },
  },
  plugins: [],
}
