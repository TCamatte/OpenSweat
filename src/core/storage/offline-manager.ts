import { Workbox } from 'workbox-window';

export class OfflineManager {
  private wb: Workbox | null = null;
  private isOnline = navigator.onLine;
  private onlineStatusCallbacks: Array<(isOnline: boolean) => void> = [];

  constructor() {
    this.initializeWorkbox();
    this.setupOnlineStatusMonitoring();
  }

  private initializeWorkbox() {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js');

      // Service worker events
      this.wb.addEventListener('controlling', () => {
        console.log('Service Worker is controlling the page');
        // Refresh the page to ensure all resources are served by the new SW
        window.location.reload();
      });

      this.wb.addEventListener('waiting', () => {
        console.log('New service worker is waiting');
        // Show update available notification
        this.showUpdateAvailable();
      });

      this.wb.addEventListener('installed', (event) => {
        if (event.isUpdate) {
          console.log('Service worker updated');
        } else {
          console.log('Service worker installed for the first time');
        }
      });

      // Register the service worker
      this.wb.register().catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }

  private setupOnlineStatusMonitoring() {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;

      if (wasOnline !== this.isOnline) {
        console.log(`Connection status changed: ${this.isOnline ? 'online' : 'offline'}`);
        this.notifyOnlineStatusChange(this.isOnline);
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check initial status
    updateOnlineStatus();
  }

  public onOnlineStatusChange(callback: (isOnline: boolean) => void) {
    this.onlineStatusCallbacks.push(callback);
    // Call immediately with current status
    callback(this.isOnline);

    // Return unsubscribe function
    return () => {
      const index = this.onlineStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.onlineStatusCallbacks.splice(index, 1);
      }
    };
  }

  private notifyOnlineStatusChange(isOnline: boolean) {
    this.onlineStatusCallbacks.forEach(callback => callback(isOnline));
  }

  private showUpdateAvailable() {
    // Create a simple notification for app update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Update Available', {
        body: 'A new version of the app is available. Restart to update.',
        icon: '/pwa-192x192.png',
        tag: 'app-update',
        requireInteraction: true
      });
    }

    // Also show in-app notification
    this.showInAppUpdateNotification();
  }

  private showInAppUpdateNotification() {
    // Create a simple banner for update notification
    const existingBanner = document.getElementById('update-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #3b82f6;
      color: white;
      padding: 12px;
      text-align: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    `;

    banner.innerHTML = `
      <span>New version available!</span>
      <button id="update-button" style="
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 4px 12px;
        margin-left: 12px;
        border-radius: 4px;
        cursor: pointer;
      ">Update Now</button>
      <button id="dismiss-button" style="
        background: transparent;
        border: none;
        color: white;
        padding: 4px 8px;
        margin-left: 8px;
        cursor: pointer;
        font-size: 16px;
      ">&times;</button>
    `;

    document.body.appendChild(banner);

    // Handle update button click
    document.getElementById('update-button')?.addEventListener('click', () => {
      this.updateApp();
    });

    // Handle dismiss button click
    document.getElementById('dismiss-button')?.addEventListener('click', () => {
      banner.remove();
    });
  }

  public async updateApp() {
    if (this.wb) {
      // Tell the waiting service worker to skip waiting and become active
      this.wb.addEventListener('controlling', () => {
        window.location.reload();
      });

      if (this.wb.waiting) {
        this.wb.messageSkipWaiting();
      }
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Cache management methods
  public async getCacheNames(): Promise<string[]> {
    if ('caches' in window) {
      return await caches.keys();
    }
    return [];
  }

  public async getCacheSize(): Promise<number> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            totalSize += parseInt(response.headers.get('content-length') || '0', 10);
          }
        }
      }

      return totalSize;
    }
    return 0;
  }

  public async clearCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  }

  // Network request with offline fallback
  public async fetchWithFallback(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    try {
      // Try network first
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      console.warn(`Network request failed for ${url}:`, error);

      // Fallback to cache
      if ('caches' in window) {
        const cache = await caches.open('runtime-cache');
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
          console.log(`Serving ${url} from cache`);
          return cachedResponse;
        }
      }

      throw error;
    }
  }

  // Preload critical resources
  public async preloadCriticalResources(urls: string[]): Promise<void> {
    if ('caches' in window) {
      const cache = await caches.open('critical-resources');

      const preloadPromises = urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (error) {
          console.warn(`Failed to preload ${url}:`, error);
        }
      });

      await Promise.all(preloadPromises);
    }
  }
}

export const offlineManager = new OfflineManager();