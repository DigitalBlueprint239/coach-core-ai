// Kill-switch service worker.
//
// Earlier builds registered a cache-first worker at /sw.js that precached files which no longer exist, which
// could pin a returning coach to an old version of the app. Browsers re-check /sw.js for updates, find this
// file, and install it. It then deletes every cache the old worker made, unregisters itself, and reloads open
// tabs so they load fresh from the network. It has no fetch handler, so it never serves anything.
// Offline mode will come back later as its own phase with a generated worker.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(windows.map((client) => client.navigate(client.url)));
    })(),
  );
});
