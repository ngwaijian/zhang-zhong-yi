const CACHE_NAME = 'zhang-zhong-yi-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './hex_interpretations.js',
    './manifest.json',
    './icon.svg',
    './open-iching-main/iching/iching.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});
