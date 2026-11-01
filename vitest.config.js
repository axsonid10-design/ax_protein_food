import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'node:test': path.resolve(__dirname, 'tests/setup/node-test-shim.js')
    }
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    include: ['tests/**/*.test.{js,jsx}']
  }
})
