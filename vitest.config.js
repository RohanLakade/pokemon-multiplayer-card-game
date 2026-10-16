import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// One test config for every workspace. The React plugin lets Vitest read JSX in client tests.
// A test that needs a browser-like page puts "// @vitest-environment jsdom" on its first line.
// The browser tests in e2e/ belong to Playwright, so Vitest must leave them alone.
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
