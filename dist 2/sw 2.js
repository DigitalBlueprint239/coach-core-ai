// public/sw.js
const CACHE_NAME = 'coach-core-v1';
const OFFLINE_CACHE_NAME = 'coach-core-offline-v1';

// ============================================
// RETRY UTILITY
// ============================================

const withRetry = async (fn, options = { maxAttempts: 3, delay: 1000 }) => {
  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === options.maxAttempts - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, options.delay * Math.pow(2, i))
      );
    }
  }
  throw new Error('Max retries reached');
};

// ============================================
// INSTALLATION AND CACHING
// ============================================

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll([
          '/',
          '/static/js/bundle.js',
          '/static/css/main.css',
          '/manifest.json',
          '/favicon.ico'
        ]);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// ============================================
// NETWORK DETECTION AND OFFLINE HANDLING
// ============================================

let isOnline = navigator.onLine;

self.addEventListener('online', () => {
  console.log('Network: Online');
  isOnline = true;
  notifyClients({ type: 'NETWORK_STATUS', status: 'online' });
  processOfflineQueue();
});

self.addEventListener('offline', () => {
  console.log('Network: Offline');
  isOnline = false;
  notifyClients({ type: 'NETWORK_STATUS', status: 'offline' });
});

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(processOfflineQueue());
  } else if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.ico'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Coach Core AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ============================================
// FETCH HANDLING
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  if (url.pathname.startsWith('/static/') || url.pathname.includes('.')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  event.respondWith(handleNavigationRequest(request));
});

async function handleAPIRequest(request) {
  return withRetry(async () => {
    try {
      // Try network first
      if (isOnline) {
        const response = await fetch(request);
        if (response.ok) {
          return response;
        }
      }
      
      // Fallback to cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline response
      return new Response(
        JSON.stringify({ error: 'Offline - No cached data available' }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
      
    } catch (error) {
      console.error('API request failed:', error);
      
      // Try cache as fallback
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return new Response(
        JSON.stringify({ error: 'Network error' }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  }, { maxAttempts: 3, delay: 1000 });
}

async function handleStaticRequest(request) {
  return withRetry(async () => {
    try {
      // Try cache first for static assets
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Fallback to network
      if (isOnline) {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
          return response;
        }
      }
      
      // Return offline page
      return caches.match('/offline.html');
      
    } catch (error) {
      console.error('Static request failed:', error);
      return caches.match('/offline.html');
    }
  }, { maxAttempts: 2, delay: 500 });
}

async function handleNavigationRequest(request) {
  return withRetry(async () => {
    try {
      // Try network first for navigation
      if (isOnline) {
        const response = await fetch(request);
        if (response.ok) {
          return response;
        }
      }
      
      // Fallback to cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline page
      return caches.match('/offline.html');
      
    } catch (error) {
      console.error('Navigation request failed:', error);
      return caches.match('/offline.html');
    }
  }, { maxAttempts: 2, delay: 1000 });
}

// ============================================
// OFFLINE QUEUE PROCESSING
// ============================================

async function processOfflineQueue() {
  console.log('Processing offline queue...');
  
  return withRetry(async () => {
    // Get all clients
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      // Send message to client to process queue
      client.postMessage({
        type: 'PROCESS_OFFLINE_QUEUE',
        timestamp: Date.now()
      });
    }
    
    console.log('Offline queue processing initiated');
  }, { maxAttempts: 3, delay: 2000 });
}

async function syncData() {
  console.log('Syncing data...');
  
  return withRetry(async () => {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_DATA',
        timestamp: Date.now()
      });
    }
    
    console.log('Data sync initiated');
  }, { maxAttempts: 3, delay: 2000 });
}

// ============================================
// MESSAGE HANDLING
// ============================================

self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'GET_NETWORK_STATUS':
      event.ports[0].postMessage({ isOnline });
      break;
      
    case 'REGISTER_BACKGROUND_SYNC':
      registerBackgroundSync(data.tag);
      break;
      
    case 'SHOW_NOTIFICATION':
      showNotification(data.title, data.options);
      break;
      
    case 'UPDATE_PROGRESS':
      updateProgress(data.progress);
      break;
      
    case 'CACHE_DATA':
      cacheData(data.key, data.value);
      break;
      
    case 'GET_CACHED_DATA':
      getCachedData(data.key, event.ports[0]);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function registerBackgroundSync(tag) {
  return withRetry(async () => {
    const registration = await self.registration;
    await registration.sync.register(tag);
    console.log('Background sync registered for tag:', tag);
  }, { maxAttempts: 3, delay: 1000 });
}

async function showNotification(title, options) {
  return withRetry(async () => {
    await self.registration.showNotification(title, options);
  }, { maxAttempts: 2, delay: 500 });
}

async function updateProgress(progress) {
  return withRetry(async () => {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({
        type: 'PROGRESS_UPDATE',
        progress,
        timestamp: Date.now()
      });
    }
  }, { maxAttempts: 2, delay: 500 });
}

async function cacheData(key, value) {
  return withRetry(async () => {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const response = new Response(JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(key, response);
    console.log('Data cached:', key);
  }, { maxAttempts: 3, delay: 1000 });
}

async function getCachedData(key, port) {
  return withRetry(async () => {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const response = await cache.match(key);
    
    if (response) {
      const data = await response.json();
      port.postMessage({ success: true, data });
    } else {
      port.postMessage({ success: false, error: 'Data not found' });
    }
  }, { maxAttempts: 2, delay: 500 }).catch(error => {
    console.error('Failed to get cached data:', error);
    port.postMessage({ success: false, error: error.message });
  });
}

async function notifyClients(message) {
  return withRetry(async () => {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage(message);
    }
  }, { maxAttempts: 2, delay: 500 });
}

// ============================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================

if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    console.log('Periodic sync triggered:', event.tag);
    
    if (event.tag === 'periodic-data-sync') {
      event.waitUntil(syncData());
    }
  });
}

// ============================================
// ERROR HANDLING
// ============================================

self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

// ============================================
// DEBUGGING
// ============================================

if (process.env.NODE_ENV === 'development') {
  console.log('Service Worker loaded in development mode');
  
  // Add development-specific features
  self.addEventListener('message', (event) => {
    if (event.data.type === 'DEBUG_INFO') {
      console.log('Service Worker Debug Info:', {
        isOnline,
        cacheNames: caches.keys(),
        clients: self.clients.matchAll()
      });
    }
  });
} 