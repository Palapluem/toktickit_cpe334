import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Seeded reference data is shared, so all files run in one worker.
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 60_000,
  },
})
