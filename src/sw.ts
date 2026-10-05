/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

import { isInternalUrl } from './shared/lib/is-internal-url';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

const API_CACHE = 'tvmaze-api';
const IMAGES_CACHE = 'tvmaze-images';
const ONE_DAY_SECONDS = 24 * 60 * 60;
const THIRTY_DAYS_SECONDS = 30 * ONE_DAY_SECONDS;

const API_PATTERN = /^https:\/\/api\.tvmaze\.com\/.*/i;
const STATIC_IMAGES_PATTERN = /^https:\/\/static\.tvmaze\.com\/.*/i;
const UPLOADS_PATTERN = /\/uploads\/images\//;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Fallback de navegación del SPA (equivalente a `navigateFallback` de generateSW).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

registerRoute(
  API_PATTERN,
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: ONE_DAY_SECONDS }),
    ],
  }),
);

const imageStrategyOptions = {
  cacheName: IMAGES_CACHE,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: THIRTY_DAYS_SECONDS }),
  ],
};

registerRoute(STATIC_IMAGES_PATTERN, new CacheFirst(imageStrategyOptions));
registerRoute(UPLOADS_PATTERN, new CacheFirst(imageStrategyOptions));

function notificationUrl(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('url' in data)) {
    return null;
  }

  const { url } = data as { url?: unknown };
  return typeof url === 'string' && url.length > 0 ? url : null;
}

async function focusOrOpen(url: string): Promise<void> {
  const safeUrl = isInternalUrl(url) ? url : '/';
  const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = windowClients.find((client): client is WindowClient => 'focus' in client);

  if (existing !== undefined) {
    await existing.focus();
    existing.postMessage({ type: 'navigate', url: safeUrl });
    return;
  }

  await self.clients.openWindow(safeUrl);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = notificationUrl(event.notification.data);
  if (url === null) {
    return;
  }

  event.waitUntil(focusOrOpen(url));
});
