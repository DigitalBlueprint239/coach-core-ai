/// <reference types="vitest/config" />
import { defineConfig, transformWithOxc, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The Smart Playbook v1 files are .js files that contain JSX (CRA allowed that). Vite only parses JSX in
// .jsx/.tsx, so compile those .js files as JSX before Vite's own transform sees them.
function jsxInJsFiles(): Plugin {
  return {
    name: 'coach-core:jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      const [file] = id.split('?');
      if (!/\/src\/.*\.js$/.test(file) || file.includes('/node_modules/')) return null;
      return transformWithOxc(code, file, { lang: 'jsx', jsx: { runtime: 'automatic' } });
    },
  };
}

// Vite replaced Create React App on 2026-11-01. Two things are kept on purpose so hosting and repo variables
// keep working unchanged: the REACT_APP_ env prefix and the build/ output folder (firebase.json hosting.public).
export default defineConfig({
  plugins: [jsxInJsFiles(), react()],
  envPrefix: 'REACT_APP_',
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    // Only the app's real entry (the repo root also holds old demo .html files), and let the dev-time
    // dependency scan read JSX in the Smart Playbook v1 .js files.
    entries: ['index.html'],
    rolldownOptions: {
      moduleTypes: { '.js': 'jsx' },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['src/_archived/**', 'src/components/SmartPlaybook/src/**', 'node_modules/**'],
  },
});
