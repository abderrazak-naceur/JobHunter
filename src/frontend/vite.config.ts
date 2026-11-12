/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/components/ui/button" instead of long relative paths (used by shadcn/ui).
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  // The default portfolio content is shared with the API and lives outside this folder.
  server: { port: 5173, fs: { allow: ['../..'] } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
    // Typing-heavy UI tests can exceed the 5 s default on a busy machine or a slow CI runner.
    testTimeout: 20000
  }
});
