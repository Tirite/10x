import { defineConfig } from 'vitest/config'

// Les tests portent sur la logique pure (scoring, export) : pas besoin du DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
