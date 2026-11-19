'use strict';

const CACHE_NAME = 'friendly-calculator-public-v9';
const CACHE_PREFIX = 'friendly-calculator-public-';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/favicon.svg',
  '/favicon-96.png',
  '/apple-touch-icon.png',
  '/assets/site-shell.js',
  '/assets/site-shell.css'
];

const isPrivatePath = pathname =>
  /(?:^|\/)(?:admin|api|login|dashboard|account)(?:\/|\.|$)/i.test(pathname);

const isCacheablePublicRequest = (request, url) => {
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  if (url.search || url.hash) return false;
  if (isPrivatePath(url.pathname)) return false;
  return request.mode === 'navigate' ||
    url.pathname.startsWith('/assets/') ||
    PRECACHE_URLS.includes(url.pathname);
};

const isSafeResponse = response => {
  if (!response || !response.ok || response.type !== 'basic') return false;
  const cacheControl = response.headers.get('cache-control') || '';
  return !/(?:private|no-store)/i.test(cacheControl);
};

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (!isCacheablePublicRequest(request, url)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (isSafeResponse(response)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match(OFFLINE_URL));
      }
    })());
    return;
  }

  // The shared site shell controls navigation and regional selectors. Always
  // revalidate it so a previous PWA cache cannot keep an obsolete Header live.
  if (url.pathname === '/assets/site-shell.js') {
    event.respondWith((async () => {
      try {
        const freshRequest = new Request(request, { cache: 'reload' });
        const response = await fetch(freshRequest);
        if (isSafeResponse(response)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (isSafeResponse(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});