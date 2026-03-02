const CACHE_NAME = 'grimorio-kael-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './script.js',
    './style.css',
    './manifest.json'
];

// Instala o service worker e faz cache dos assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Cache aberto');
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.log('[ServiceWorker] Erro no cache completo, tentando cache parcial', err);
                return Promise.all([
                    cache.add('./index.html'),
                    cache.add('./script.js'),
                    cache.add('./style.css')
                ]).catch(e => console.log('[ServiceWorker] Erro no cache parcial:', e));
            });
        }).catch(err => {
            console.log('[ServiceWorker] Erro ao abrir cache:', err);
        })
    );
    self.skipWaiting();
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Ativando...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Estratégia Network First com fallback para Cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requisições de API externas
    if (url.hostname !== self.location.hostname) {
        event.respondWith(
            fetch(request).catch(() => {
                console.log('[ServiceWorker] Offline - requisição externa bloqueada:', url.href);
                return new Response('Offline', { status: 503 });
            })
        );
        return;
    }

    // Network first para documentos HTML
    if (request.headers.get('Accept')?.includes('text/html') || request.url.endsWith('/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clonedResponse);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    console.log('[ServiceWorker] Usando cache para:', request.url);
                    return caches.match(request);
                })
        );
        return;
    }

    // Cache first para outros assets
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    console.log('[ServiceWorker] Cache hit:', request.url);
                    return response;
                }
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clonedResponse);
                        });
                    }
                    return response;
                });
            })
            .catch(() => {
                console.log('[ServiceWorker] Offline - asset não disponível:', request.url);
                return new Response('Offline', { status: 503 });
            })
    );
});
