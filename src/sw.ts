/// <reference lib="webworker" />
import { clientsClaim, type RouteMatchCallback } from 'workbox-core';
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

import { parsePushPayload } from './infrastructure/notifications/push-payload';
import { isInternalUrl } from './shared/lib/is-internal-url';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

const API_CACHE = 'tvmaze-api';
const IMAGES_CACHE = 'tvmaze-images';
const ONE_DAY_SECONDS = 24 * 60 * 60;
const THIRTY_DAYS_SECONDS = 30 * ONE_DAY_SECONDS;
const NOTIFICATION_ICON = '/icons/pwa-192x192.png';
const NOTIFICATION_BADGE = '/icons/pwa-192x192.png';
const DEFAULT_PUSH_TITLE = 'Epix';
const DEFAULT_PUSH_BODY = 'Tienes novedades en tus series favoritas.';

const API_PATTERN = /^https:\/\/api\.tvmaze\.com\/.*/i;
const STATIC_IMAGES_PATTERN = /^https:\/\/static\.tvmaze\.com\/.*/i;
const UPLOADS_PATTERN = /\/uploads\/images\//;

// La agenda se pide al proxy de mismo origen (`/api/schedule`), no a
// api.tvmaze.com; esta ruta la cachea igual que el resto de la API.
const SAME_ORIGIN_SCHEDULE: RouteMatchCallback = ({ url }) =>
  url.origin === self.location.origin && url.pathname === '/api/schedule';

clientsClaim();

// Flujo prompt: la versión nueva queda en espera hasta que la app lo pide
// (botón «Actualizar» → `postMessage({ type: 'SKIP_WAITING' })`).
self.addEventListener('message', (event) => {
  const data: unknown = event.data;
  if (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === 'SKIP_WAITING'
  ) {
    void self.skipWaiting();
  }
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Fallback de navegación del SPA (equivalente a `navigateFallback` de generateSW).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// P-14: misma política para el API de TVmaze y el proxy de la agenda (mismo
// origen); se factoriza para que ambas rutas no puedan divergir.
const API_STRATEGY_OPTIONS = {
  cacheName: API_CACHE,
  networkTimeoutSeconds: 8,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: ONE_DAY_SECONDS }),
  ],
};

registerRoute(API_PATTERN, new NetworkFirst(API_STRATEGY_OPTIONS));

registerRoute(SAME_ORIGIN_SCHEDULE, new NetworkFirst(API_STRATEGY_OPTIONS));

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

async function handlePush(event: PushEvent): Promise<void> {
  const payload = parsePushPayload(event.data);

  const options: NotificationOptions = {
    body: payload.body ?? DEFAULT_PUSH_BODY,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
  };

  if (payload.url !== undefined) {
    options.data = { url: payload.url };
  }

  await self.registration.showNotification(payload.title ?? DEFAULT_PUSH_TITLE, options);
}

// Push real (Web Push + VAPID): Epix lo envía desde la Edge Function `epix-push`.
self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event));
});
