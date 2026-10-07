const CACHE_NAME = 'finance-erp-v1';
const ASSETS_TO_CACHE = [
    './finance.html',
    './css/finance.css',
    './css/finance2.css',
    './css/tailwind.js',
    './js/finance-core.js',
    './js/finance-db.js',
    './js/finance-deductions.js',
    './js/finance-dept-logs.js',
    './js/finance-diagnostics.js',
    './js/finance-firebase.js',
    './js/finance-pos.js',
    './js/finance-shared.js',
    './js/finance-smart-delta.js',
    './js/finance-stock.js',
    './js/finance-sync.js',
    './js/finance2.js',
    './js/session-guard.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // We only want to intercept local requests, not Firebase API calls
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
