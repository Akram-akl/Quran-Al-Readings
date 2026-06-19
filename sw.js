const SHELL_CACHE = 'quran-shell-v5.9';
const SW_VERSION = 'v5.9';

const STATIC_ASSETS = [
    './fonts/uthmanic_hafs_v20.ttf',
    './fonts/uthmanic_warsh_v21.ttf',
    './fonts/uthmanic_qaloun_v21.ttf',
    './fonts/uthmanic_douri_v20.ttf',
    './fonts/uthmanic_shuba_v20.ttf',
    './fonts/uthmanic_sousi_v20.ttf',
    './assets/logo-192.png',
    './assets/logo-512.png'
];

function isLiveAppRequest(url, request) {
    if (request.mode === 'navigate') return true;
    const path = url.pathname;
    return (
        path.endsWith('/sw.js') ||
        path.endsWith('sw.js') ||
        path.endsWith('/index.html') ||
        path.endsWith('index.html') ||
        path.endsWith('version.json') ||
        path.endsWith('/version.json') ||
        path.includes('/css/') ||
        path.includes('/js/')
    );
}

function notifyUpdateReady() {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
            client.postMessage({ type: 'APP_UPDATE_READY', version: SW_VERSION });
        });
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => notifyUpdateReady())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) =>
                Promise.all(
                    keys.map((key) => {
                        if (key.startsWith('quran-shell-') && key !== SHELL_CACHE) {
                            return caches.delete(key);
                        }
                    })
                )
            ),
            self.clients.claim()
        ])
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    if (url.origin === location.origin && isLiveAppRequest(url, event.request)) {
        event.respondWith(
            fetch(event.request).catch(() =>
                event.request.mode === 'navigate'
                    ? caches.match('./index.html')
                    : undefined
            )
        );
        return;
    }

    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return (
                    cached ||
                    fetch(event.request).then((res) => {
                        if (res && res.ok) {
                            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, res.clone()));
                        }
                        return res;
                    })
                );
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(async (cachedResponse) => {
            if (cachedResponse) {
                const rangeHeader = event.request.headers.get('range');
                if (rangeHeader && cachedResponse.status === 200) {
                    const buffer = await cachedResponse.clone().arrayBuffer();
                    const total = buffer.byteLength;
                    const parts = rangeHeader.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
                    if (start >= total || end >= total) {
                        return new Response(null, { status: 416, statusText: 'Range Not Satisfiable', headers: { 'Content-Range': `bytes */${total}` }});
                    }
                    const chunk = buffer.slice(start, end + 1);
                    return new Response(chunk, {
                        status: 206,
                        statusText: 'Partial Content',
                        headers: new Headers({
                            'Content-Type': cachedResponse.headers.get('content-type') || 'audio/mpeg',
                            'Content-Range': `bytes ${start}-${end}/${total}`,
                            'Content-Length': chunk.byteLength,
                            'Accept-Ranges': 'bytes'
                        })
                    });
                }
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                if (url.hostname.includes('surahapp.com')) {
                    return new Response(
                        JSON.stringify({
                            error: 'الرجاء الاتصال بالإنترنت. هذه البيانات غير محملة مسبقاً في الجهاز.'
                        }),
                        {
                            status: 200,
                            headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' })
                        }
                    );
                }
                return new Response('', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});
