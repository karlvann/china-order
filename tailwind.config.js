/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => ({ opacityValue }) => {
  if (opacityValue !== undefined) {
    return `rgb(var(${variable}) / ${opacityValue})`
  }
  return `rgb(var(${variable}) / 1)`
}

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
        background: withOpacity('--color-background'),
        surface: withOpacity('--color-surface'),
        'surface-hover': withOpacity('--color-surface-hover'),
        'surface-muted': withOpacity('--color-surface-muted'),
        'modal-surface': withOpacity('--color-modal-surface'),
        'modal-header': withOpacity('--color-modal-header'),
        'input-surface': withOpacity('--color-input-surface'),
        'control-surface': withOpacity('--color-control-surface'),
        'control-hover': withOpacity('--color-control-hover'),
        overlay: withOpacity('--color-overlay'),
        border: withOpacity('--color-border'),
        'border-strong': withOpacity('--color-border-strong'),
        primary: withOpacity('--color-text'),
        muted: withOpacity('--color-text-muted'),
        subtle: withOpacity('--color-text-subtle'),
        disabled: withOpacity('--color-text-disabled'),
        inverse: withOpacity('--color-text-inverse'),
        'table-header': withOpacity('--color-table-header'),
        'table-current': withOpacity('--color-table-current'),
        'toggle-off': withOpacity('--color-toggle-off'),
        'toggle-knob': withOpacity('--color-toggle-knob'),
        'button-primary': withOpacity('--color-button-primary'),
        'button-primary-hover': withOpacity('--color-button-primary-hover'),
        'button-primary-text': withOpacity('--color-button-primary-text'),
        brand: {
          DEFAULT: withOpacity('--color-brand'),
          hover: withOpacity('--color-brand-hover'),
          light: withOpacity('--color-brand-light'),
          dark: withOpacity('--color-brand-dark')
        },
        'accent-sri-lanka': {
          DEFAULT: withOpacity('--color-accent-sri-lanka'),
          hover: withOpacity('--color-accent-sri-lanka-hover'),
          light: withOpacity('--color-accent-sri-lanka-light')
        },
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
        danger: {
          DEFAULT: withOpacity('--color-danger'),
          hover: withOpacity('--color-danger-hover')
        },
        error: withOpacity('--color-danger'),
        info: withOpacity('--color-info')
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace']
      },
      boxShadow: {
        panel: '-4px 0 15px rgb(var(--color-overlay) / 0.3)'
      }
    }
  },
  plugins: []
}
