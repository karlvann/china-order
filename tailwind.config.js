/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom dark theme colors matching original design
        background: '#0a0a0b',
        surface: '#18181b',
        surfaceHover: '#27272a',
        border: '#27272a',
        borderHover: '#3f3f46',
        // Brand colors
        brand: {
          DEFAULT: '#0ea5e9',
          light: '#38bdf8',
          dark: '#0284c7'
        },
        // Status colors
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        info: '#60a5fa'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace']
      }
    }
  },
  plugins: []
}
