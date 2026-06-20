import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Scope test discovery to the application. The vendored skill collection under
// .agents/ ships its own example tests with dependencies that aren't installed
// here, so they must not run as part of the app's suite (or CI).
export default defineConfig({
  // React plugin so component tests (*.dom.test.tsx) can render JSX.
  plugins: [react()],
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
