import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const smartPlaybookJsxPlugin = {
  name: 'smartplaybook-js-as-jsx',
  enforce: 'pre' as const,
  async transform(code: string, id: string) {
    if (id.includes('/src/components/SmartPlaybook/') && id.endsWith('.js')) {
      return transformWithEsbuild(code, id, {
        loader: 'jsx',
        jsx: 'automatic'
      });
    }
    return null;
  }
};

export default defineConfig({
  plugins: [smartPlaybookJsxPlugin, react({ include: /\.(js|jsx|ts|tsx)$/ })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    entries: ['index.html'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: ['archive/**', 'node_modules/**', 'coach-core-ai/**']
  }
});
