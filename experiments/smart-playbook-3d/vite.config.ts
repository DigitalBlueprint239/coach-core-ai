/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Isolated experiment: no env injection, no proxy, no remote resources.
export default defineConfig({
  plugins: [react()],
  envPrefix: 'SP3D_EXPERIMENT_',
  // Inline config stops Vite from picking up the parent app's postcss.config.js (Tailwind).
  css: { postcss: { plugins: [] } },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 900 },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
