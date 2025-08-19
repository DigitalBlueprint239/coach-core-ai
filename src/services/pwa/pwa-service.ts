export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  scope: string;
  startUrl: string;
  icons: PWAIcon[];
  categories: string[];
  lang: string;
  dir: 'ltr' | 'rtl';
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'maskable' | 'any';
}

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAUpdateInfo {
  available: boolean;
  version?: string;
  changelog?: string;
  downloadSize?: number;
}

class PWAService {
  private config: PWAConfig;
  private isInstalled: boolean = false;
  private deferredPrompt: PWAInstallPrompt | null = null;
  private updateInfo: PWAUpdateInfo = { available: false };
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.config = {
      name: 'Coach Core',
      shortName: 'CoachCore',
      description: 'Complete coaching platform for team management, practice planning, and strategic development',
      themeColor: '#3182ce',
      backgroundColor: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      startUrl: '/',
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      categories: ['sports', 'productivity', 'education'],
      lang: 'en-US',
      dir: 'ltr',
    };

    this.initializePWA();
  }

  private async initializePWA(): Promise<void> {
    try {
      // Check if PWA is already installed
      this.isInstalled = this.checkIfInstalled();

      // Register service worker
      await this.registerServiceWorker();

      // Listen for install prompt
      this.listenForInstallPrompt();

      // Check for updates
      this.checkForUpdates();

      // Setup offline detection
      this.setupOfflineDetection();

      console.log('PWA Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PWA:', error);
    }
  }

  private checkIfInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.serviceWorkerRegistration);

        // Listen for updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateInfo.available = true;
                this.notifyUpdateAvailable();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private listenForInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as PWAInstallPrompt;
      this.notifyInstallPromptAvailable();
    });
  }

  private checkForUpdates(): void {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.update();
    }
  }

  private setupOfflineDetection(): void {
    window.addEventListener('online', () => {
      this.notifyOnlineStatus(true);
    });

    window.addEventListener('offline', () => {
      this.notifyOnlineStatus(false);
    });
  }

  // **Public Methods**

  public async installPWA(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installed successfully');
        this.isInstalled = true;
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('PWA installation dismissed');
        return false;
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    }
  }

  public async updatePWA(): Promise<boolean> {
    if (!this.serviceWorkerRegistration || !this.updateInfo.available) {
      return false;
    }

    try {
      await this.serviceWorkerRegistration.update();
      this.updateInfo.available = false;
      return true;
    } catch (error) {
      console.error('PWA update failed:', error);
      return false;
    }
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  public async sendPushNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<boolean> {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  public async cacheData(
    cacheName: string,
    urls: string[]
  ): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cache = await caches.open(cacheName);
      await cache.addAll(urls);
      return true;
    } catch (error) {
      console.error('Failed to cache data:', error);
      return false;
    }
  }

  public async getCachedData(
    cacheName: string,
    url: string
  ): Promise<Response | null> {
    if (!('caches' in window)) {
      return null;
    }

    try {
      const cache = await caches.open(cacheName);
      return await cache.match(url);
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  public async clearCache(cacheName?: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  public getManifest(): PWAConfig {
    return this.config;
  }

  public isPWAInstalled(): boolean {
    return this.isInstalled;
  }

  public isInstallPromptAvailable(): boolean {
    return this.deferredPrompt !== null;
  }

  public getUpdateInfo(): PWAUpdateInfo {
    return this.updateInfo;
  }

  public isOnline(): boolean {
    return navigator.onLine;
  }

  public getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
    return this.serviceWorkerRegistration;
  }

  // **Private Helper Methods**

  private notifyInstallPromptAvailable(): void {
    // Dispatch custom event for UI to listen to
    window.dispatchEvent(new CustomEvent('pwa-install-prompt-available'));
  }

  private notifyUpdateAvailable(): void {
    // Dispatch custom event for UI to listen to
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  private notifyOnlineStatus(isOnline: boolean): void {
    // Dispatch custom event for UI to listen to
    window.dispatchEvent(new CustomEvent('pwa-online-status', {
      detail: { isOnline }
    }));
  }

  // **Utility Methods**

  public generateManifest(): string {
    const manifest = {
      name: this.config.name,
      short_name: this.config.shortName,
      description: this.config.description,
      theme_color: this.config.themeColor,
      background_color: this.config.backgroundColor,
      display: this.config.display,
      orientation: this.config.orientation,
      scope: this.config.scope,
      start_url: this.config.startUrl,
      icons: this.config.icons,
      categories: this.config.categories,
      lang: this.config.lang,
      dir: this.config.dir,
    };

    return JSON.stringify(manifest, null, 2);
  }

  public generateServiceWorker(): string {
    return `
      const CACHE_NAME = 'coach-core-v1';
      const urlsToCache = [
        '/',
        '/index.html',
        '/static/js/bundle.js',
        '/static/css/main.css',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ];

      self.addEventListener('install', (event) => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
        );
      });

      self.addEventListener('fetch', (event) => {
        event.respondWith(
          caches.match(event.request)
            .then((response) => {
              if (response) {
                return response;
              }
              return fetch(event.request);
            })
        );
      });

      self.addEventListener('push', (event) => {
        const options = {
          body: event.data ? event.data.text() : 'New notification from Coach Core',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          vibrate: [100, 50, 100],
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
          }
        };

        event.waitUntil(
          self.registration.showNotification('Coach Core', options)
        );
      });
    `;
  }
}

export const pwaService = new PWAService();
export default pwaService;
