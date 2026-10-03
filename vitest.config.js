import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// One test config for every workspace. The React plugin lets Vitest read JSX in client tests.
// A test that needs a browser-like page puts "// @vitest-environment jsdom" on its first line.
export default defineConfig({
  plugins: [react()],
});
