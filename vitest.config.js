import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,ts}']
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '~/lib': fileURLToPath(new URL('./lib', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@/lib': fileURLToPath(new URL('./lib', import.meta.url))
    }
  }
})
