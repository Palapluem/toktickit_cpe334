import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Reference data is seeded once per run and read by many suites; running
    // files in parallel against one database makes that seed a shared mutable
    // resource. Sequential execution is the cheaper correctness guarantee here.
    fileParallelism: false,
    hookTimeout: 60_000,
  },
})
