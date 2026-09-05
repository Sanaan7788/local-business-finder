const rgb = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:      rgb('bg'),
        surface: { DEFAULT: rgb('surface'), 2: rgb('surface-2') },
        line:    { DEFAULT: rgb('line'), strong: rgb('line-strong') },
        fg:      { DEFAULT: rgb('fg'), muted: rgb('fg-muted'), subtle: rgb('fg-subtle') },
        primary: { DEFAULT: rgb('primary'), hover: rgb('primary-hover'), soft: rgb('primary-soft'), fg: rgb('primary-fg') },
      },
      borderColor: ({ theme }) => ({ DEFAULT: theme('colors.line.DEFAULT') }),
      divideColor: ({ theme }) => ({ DEFAULT: theme('colors.line.DEFAULT') }),
      ringColor:   ({ theme }) => ({ DEFAULT: theme('colors.primary.DEFAULT') }),
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / var(--shadow-a))',
        pop:  '0 10px 30px rgb(0 0 0 / var(--shadow-a-lg))',
      },
    },
  },
  plugins: [],
}
