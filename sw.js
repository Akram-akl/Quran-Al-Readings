self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // We only intercept specific domains that we know we cache (Audio and API)
    if (url.hostname.includes('archive.org') || url.hostname.includes('surahapp.com') || url.hostname.includes('github.io')) {
        event.respondWith(
            caches.open('quran-offline-v1').then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                try {
                    return await fetch(event.request);
                } catch (err) {
                    // Offline and not cached
                    if (url.hostname.includes('surahapp.com')) {
                        return new Response(JSON.stringify({ error: 'الرجاء الاتصال بالإنترنت. هذه البيانات غير محملة مسبقاً في الجهاز.' }), {
                            status: 200, // Return 200 so our app can parse the JSON error
                            headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' })
                        });
                    }
                    
                    // For audio, just fail gracefully
                    return new Response('', { status: 503, statusText: 'Service Unavailable' });
                }
            })
        );
    }
});
