const CACHE_NAME = 'quran-offline-v2';
const APP_SHELL = [
    './',
    './index.html',
    './css/style.css',
    './js/config.js',
    './js/api.js',
    './js/db.js',
    './js/audioPlayer.js',
    './js/download.js',
    './js/offlineManager.js',
    './js/ui.js',
    './js/tagsAndContext.js',
    './js/app.js',
    './fonts/uthmanic_hafs_v20.ttf',
    './fonts/uthmanic_warsh_v21.ttf',
    './fonts/uthmanic_qaloun_v21.ttf',
    './fonts/uthmanic_douri_v20.ttf',
    './fonts/uthmanic_shuba_v20.ttf',
    './fonts/uthmanic_sousi_v20.ttf',
    './assets/logo-192.png',
    './assets/logo-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // 1. Local requests (App Shell)
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Return cached shell if found, else fetch from network
                return response || fetch(event.request).then(fetchRes => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, fetchRes.clone());
                        return fetchRes;
                    });
                });
            }).catch(() => {
                // If totally offline and not in cache, fallback to index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
        );
        return;
    }
    
    // 2. External requests (API and Audio)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Return downloaded offline data
            }
            
            // Try network
            return fetch(event.request).catch(() => {
                // Offline and not cached
                if (url.hostname.includes('surahapp.com')) {
                    return new Response(JSON.stringify({ error: 'الرجاء الاتصال بالإنترنت. هذه البيانات غير محملة مسبقاً في الجهاز.' }), {
                        status: 200, 
                        headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' })
                    });
                }
                return new Response('', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});
