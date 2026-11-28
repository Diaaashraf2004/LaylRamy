const CACHE_NAME = 'finance-erp-v154'; // Smart localStorage quota eviction & compact local backups
const ASSETS_TO_CACHE = [
  './finance.html',
  './css/finance.css',
  './css/finance2.css',
  './css/tailwind.js',
  './css/icon-192.png',
  './css/icon-512.png',
  './css/icon-maskable-512.png',
  './css/apple-touch-icon.png',
  './manifest.json',
  './js/core/core-firebase.js',
  './js/core/core-session-guard.js',
  './js/core/core-save-guard.js',
  './js/integrity/integrity-engine.js',
  './js/integrity/integrity-checks.js',
  './js/integrity/integrity-ui.js',
  './js/core/core-shared.js',
  './js/core/core-sync.js',
  './js/core/core-state.js',
  './js/core/core-db.js',
  './js/core/core-smart-delta.js',
  './js/core/core-diagnostics.js',
  './js/inventory/inventory-stock.js',
  './js/core/core-helpers.js',
  './js/core/core-fc.js',
  './js/reports/reports-print.js',
  './js/reports/reports-daily.js',
  './js/reports/reports-monthly.js',
  './js/reports/reports-expenses.js',
  './js/serials/serials-tracker.js',
  './js/serials/serials-supplier.js',
  './js/serials/serials-views.js',
  './js/serials/serials-scanner.js',
  './js/serials/serials-scanner-ui.js',
  './js/serials/serials-scanner-camera.js',
  './js/inventory/inventory-products.js',
  './js/inventory/inventory-purchase.js',
  './js/inventory/inventory-supplier-statement.js',
  './js/inventory/inventory-product-profit.js',
  './js/inventory/inventory-ui.js',
  './js/sales/sales-repeat-alarm.js',
  './js/sales/sales-pending.js',
  './js/sales/sales-invoice-stock.js',
  './js/sales/sales-invoice-view.js',
  './js/sales/sales-invoice.js',
  './js/sales/sales-actions.js',
  './js/sales/sales-quick.js',
  './js/sales/sales-usm.js',
  './js/sales/sales-search.js',
  './js/debts/debts-list.js',
  './js/debts/debts-conversion.js',
  './js/debts/debts-collection.js',
  './js/returns/returns-sales.js',
  './js/returns/returns-cancellation.js',
  './js/returns/returns-purchase.js',
  './js/returns/returns-views.js',
  './js/logs/logs-operation.js',
  './js/logs/logs-backup.js',
  './js/logs/logs-daily-state.js',
  './js/treasury/treasury-core.js',
  './js/customers/customers-core.js',
  './js/accounts/accounts-core.js',
  './js/invoices/invoices-core.js',
  './js/invoices/invoices-viewer.js',
  './js/core/core-bootstrap.js',
  './js/logs/logs-department.js',
  './js/deductions/deductions-core.js',
  './js/exchanges/exchanges-ui.js',
  './js/exchanges/exchanges-calc.js',
  './js/exchanges/exchanges-orders.js',
  './js/finance2.js',
  './js/sales/sales-pos.js',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') { return; }
    let reqUrl;
    try {
        reqUrl = new URL(event.request.url);
    } catch (_) {
        return;
    }
    // Never intercept cross-origin requests (Firebase, CDNs, Google Fonts, QR API)
    if (reqUrl.origin !== self.location.origin) {
        return;
    }

    const canonicalKey = reqUrl.origin + reqUrl.pathname;
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
            cache.match(canonicalKey, { ignoreSearch: true }).then((cached) => {
                const network = fetch(event.request).then((resp) => {
                    if (resp && resp.ok) {
                        cache.put(canonicalKey, resp.clone());
                    }
                    return resp;
                }).catch(() => cached || new Response('', { status: 503, statusText: 'Offline' }));
                return cached || network;
            })
        )
    );
});
