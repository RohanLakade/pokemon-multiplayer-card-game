import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  // The Tailwind plugin reads index.css and generates only the classes the code uses
  plugins: [react(), tailwindcss()],
});
