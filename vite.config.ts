import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const enableAnalyzer = process.env.ANALYZE === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer when enabled
    ...(enableAnalyzer
      ? [
          visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      // Ensure React context is properly resolved
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Enhanced build optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Enhanced chunk splitting strategy for optimal performance
        manualChunks: {
          // Core React libraries (keep small for initial load)
          'react-vendor': ['react', 'react-dom'],
          
          // UI Framework (split by usage to enable tree-shaking)
          'chakra-core': ['@chakra-ui/react'],
          'chakra-emotion': ['@emotion/react', '@emotion/styled'],
          'framer-motion': ['framer-motion'],
          
          // Heavy libraries (lazy load when needed)
          'canvas-libs': ['konva', 'react-konva'],
          'd3-libs': ['d3', 'd3-soccer'],
          'charts-libs': ['recharts'],
          'ai-libs': ['@firebase/ai', '@firebase/vertexai'],
          'sentry-libs': ['@sentry/react', '@sentry/tracing'],
          
          // Routing and utilities (keep in main bundle)
          'router': ['react-router-dom'],
          'utils': ['lucide-react', 'zod'],
          
      // Firebase (split by usage for better caching)
      'firebase-auth': ['firebase/auth'],
      'firebase-firestore': ['firebase/firestore'],
      'firebase-storage': ['firebase/storage'],
      'firebase-analytics': ['firebase/analytics'],
      'firebase-performance': ['firebase/performance'],
      
      // Google Cloud (server-side only)
      'google-cloud': ['@google-cloud/bigquery'],
          
          // Query and state management
          'query-libs': ['@tanstack/react-query'],
          'state-libs': ['zustand'],
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Performance optimizations
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@chakra-ui/react',
      '@emotion/react',
      '@emotion/styled',
      'framer-motion',
      'lucide-react',
      'recharts',
      'react-router-dom',
    ],
    // Exclude heavy dependencies from pre-bundling
    exclude: ['@firebase/ai', 'konva', 'react-konva', '@capacitor/haptics'],
    // Force resolution of React context issues
    force: true,
    // Ensure proper React context handling
    esbuildOptions: {
      jsx: 'automatic',
    },
  },
  define: {
    'process.env': {},
    // Global constants for optimization
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    // Ensure React context is available globally
    'global': 'globalThis',
  },
  // Performance optimizations
  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': true,
    },
  },
});
