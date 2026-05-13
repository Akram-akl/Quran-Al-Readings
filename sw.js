const CACHE_NAME = 'quran-readings-v3';
const STATIC_ASSETS = [
    'index.html',
    'css/style.css',
    'js/config.js',
    'js/dataHandler.js',
    'js/audioPlayer.js',
    'js/search.js',
    'js/download.js',
    'js/listen.js',
    'js/ui.js',
    'js/app.js',
    'manifest.json',
    'assets/logo.png',
    'fonts/uthmanic_hafs_v20.ttf',
    'fonts/uthmanic_warsh_v21.ttf',
    'fonts/uthmanic_qaloun_v21.ttf',
    'fonts/uthmanic_douri_v20.ttf',
    'fonts/uthmanic_sousi_v20.ttf',
    'fonts/uthmanic_shuba_v20.ttf'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // تخزين ملفات JSON والصوت والخطوط
                if (response.ok && (
                    event.request.url.endsWith('.json') || 
                    event.request.url.endsWith('.mp3') ||
                    event.request.url.endsWith('.ttf')
                )) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);
        })
    );
});
