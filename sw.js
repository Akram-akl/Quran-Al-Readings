const SHELL_CACHE = 'quran-shell-v15';
const SW_VERSION = '15';
const DATA_CACHE = 'quran-offline-v2';

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
    './js/saveFile.js',
    './fonts/uthmanic_hafs_v20.ttf',
    './fonts/uthmanic_warsh_v21.ttf',
    './fonts/uthmanic_qaloun_v21.ttf',
    './fonts/uthmanic_douri_v20.ttf',
    './fonts/uthmanic_shuba_v20.ttf',
    './fonts/uthmanic_sousi_v20.ttf',
    './assets/logo-192.png',
    './assets/logo-512.png'
];

function isNetworkFirstRequest(url, request) {
    if (request.mode === 'navigate') return true;
    const path = url.pathname;
    return (
        path.endsWith('/index.html') ||
        path.endsWith('index.html') ||
        path.endsWith('/sw.js') ||
        path.endsWith('sw.js') ||
        path.includes('/css/') ||
        path.includes('/js/')
    );
}

function notifyClientsUpdateReady() {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
            client.postMessage({ type: 'APP_UPDATE_READY', version: SW_VERSION });
        });
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => notifyClientsUpdateReady())
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

    if (url.origin === location.origin) {
        if (isNetworkFirstRequest(url, event.request)) {
            event.respondWith(
                fetch(event.request)
                    .then((fetchRes) => {
                        if (fetchRes && fetchRes.ok) {
                            caches.open(SHELL_CACHE).then((cache) => {
                                cache.put(event.request, fetchRes.clone());
                            });
                        }
                        return fetchRes;
                    })
                    .catch(() =>
                        caches.match(event.request).then(
                            (cached) =>
                                cached ||
                                (event.request.mode === 'navigate'
                                    ? caches.match('./index.html')
                                    : undefined)
                        )
                    )
            );
            return;
        }

        event.respondWith(
            caches.match(event.request).then((response) => {
                return (
                    response ||
                    fetch(event.request).then((fetchRes) => {
                        return caches.open(SHELL_CACHE).then((cache) => {
                            cache.put(event.request, fetchRes.clone());
                            return fetchRes;
                        });
                    })
                );
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
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
