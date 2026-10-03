/* =========================================================
   Service worker — fonctionnement hors-ligne
   Pense à changer CACHE_VERSION à chaque mise à jour des fichiers.
   ========================================================= */
const CACHE_VERSION = 'vtaper-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/store.js',
  './js/engine.js',
  './js/charts.js',
  './js/ui.js',
  './js/timer.js',
  './js/views/home.js',
  './js/views/session.js',
  './js/views/calendar.js',
  './js/views/stats.js',
  './js/views/program.js',
  './js/views/settings.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord (instantané, hors-ligne), puis mise à jour en arrière-plan
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;

  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(key, { ignoreSearch: true }).then(cached => {
        const network = fetch(req)
          .then(res => {
            if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
