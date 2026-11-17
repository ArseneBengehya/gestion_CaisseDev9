const CACHE_PREFIX = 'caisse-dev9-';
const PAGE_CACHE = `${CACHE_PREFIX}pages-v1`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-v1`;
const APP_CACHES = [PAGE_CACHE, ASSET_CACHE];
const PRECACHE_URLS = ['/offline.html', '/manifest.json', '/icon.svg'];
const APP_ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard/contributions',
  '/dashboard/depenses',
  '/dashboard/emprunts',
  '/dashboard/membres',
  '/dashboard/regles',
  '/dashboard/retards',
  '/espace_Membre',
  '/espace_Membre/profil',
  '/espace_Membre/regles',
  '/espace_Membre/transactions',
];
const STATIC_ASSET_PATTERN = /(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g;

async function precacheAppRoutes() {
  const pageCache = await caches.open(PAGE_CACHE);
  const staticAssets = new Set(
    PRECACHE_URLS.map((path) => new URL(path, self.location.origin).href)
  );

  await Promise.all(APP_ROUTES.map(async (path) => {
    const request = new Request(new URL(path, self.location.origin), {
      credentials: 'same-origin',
    });

    try {
      const response = await fetch(request);
      if (!response.ok || response.type !== 'basic') return;

      const html = await response.clone().text();
      await pageCache.put(request, response);
      for (const match of html.matchAll(STATIC_ASSET_PATTERN)) {
        staticAssets.add(new URL(match[1], self.location.origin).href);
      }
    } catch (error) {
      console.warn(`Impossible de précharger la page ${path} :`, error);
    }
  }));

  const assetCache = await caches.open(ASSET_CACHE);
  await Promise.all([...staticAssets].map(async (url) => {
    if (PRECACHE_URLS.some((path) => new URL(path, self.location.origin).href === url)) return;
    try {
      const response = await fetch(url);
      if (response.ok) await assetCache.put(url, response);
    } catch (error) {
      console.warn('Impossible de précharger une ressource PWA :', error);
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => precacheAppRoutes())
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && !APP_CACHES.includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(PAGE_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          try {
            await cache.put(request, response.clone());
          } catch (error) {
            console.warn('Impossible de mettre la page en cache hors ligne :', error);
          }
        }
        return response;
      } catch {
        return (await cache.match(request)) || (await caches.match('/offline.html')) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok) {
        try {
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn('Impossible de mettre la ressource en cache hors ligne :', error);
        }
      }
      return response;
    })());
  }
});
