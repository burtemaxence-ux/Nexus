import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'

// Scope test discovery to the application. The vendored skill collection under
// .agents/ ships its own example tests with dependencies that aren't installed
// here, so they must not run as part of the app's suite (or CI).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.agents/**'],
  },
  resolve: {
    // Mirror the tsconfig "@/*" -> "./*" path alias so tests can import app modules.
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''),
    },
  },
})
