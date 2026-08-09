/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50, #f0f7ff)',
          100: 'var(--color-brand-100, #e0effe)',
          500: 'var(--color-brand-500, #0284c7)',
          600: 'var(--color-brand-600, #0369a1)',
          700: 'var(--color-brand-700, #075985)',
          900: 'var(--color-brand-900, #0c4a6e)',
        },
        accent: {
          500: 'var(--color-accent-500, #10b981)',
          600: 'var(--color-accent-600, #059669)',
        }
      },
      fontFamily: {
        arabic: ['var(--font-arabic, Tajawal)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
