import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf9f4',
          100: '#f5ead8',
          200: '#e8d2b4',
          300: '#d4b48a',
          400: '#c09060',
          500: '#a8763c',
          600: '#8c6030',
          700: '#724c24',
          800: '#583818',
          900: '#3c240e',
        },
        cream: {
          50: '#fefcf8',
          100: '#faf6ef',
          200: '#f4ece0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
