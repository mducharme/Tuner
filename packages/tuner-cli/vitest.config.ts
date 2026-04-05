import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/parse-args.ts'],
      thresholds: {
        lines: 85,
        functions: 100,
        branches: 80,
        statements: 85,
      },
    },
  },
})
