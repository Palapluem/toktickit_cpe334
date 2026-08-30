import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Seeded reference data is shared, so files run sequentially.
    fileParallelism: false,
    hookTimeout: 60_000,
  },
})
