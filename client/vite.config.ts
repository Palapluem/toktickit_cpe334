import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/lab-01/setup.ts',
    include: ['tests/lab-01/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
