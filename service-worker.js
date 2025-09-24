const CACHE_NAME = 'office-events-v1';
const PRECACHE = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'events.json',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('events.json')) {
    event.respondWith(
      fetch(event.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return r;
      }).catch(() => caches.match('events.json'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).catch(() => caches.match('index.html')))
  );
});
