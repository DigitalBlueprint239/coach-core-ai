// Emotion setup to ensure proper initialization
import createCache from '@emotion/cache';

// Create emotion cache with proper configuration for production
const emotionCache = createCache({
  key: 'css',
  prepend: true,
  // Enable speedy mode for production builds
  speedy: import.meta.env.PROD,
});

export { emotionCache };
