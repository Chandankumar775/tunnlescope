const c = (v) => `rgb(var(--${v}) / <alpha-value>)`
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: c('paper'), muted: c('muted'), panel: c('panel'), panel2: c('panel2'),
        rule: c('rule'), esp: c('esp'), ike: c('ike'), ah: c('ah'), solid: c('solid'),
        lime: c('lime'), pass: c('pass'), low: c('low'), medium: c('medium'),
        high: c('high'), critical: c('critical'),
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}
