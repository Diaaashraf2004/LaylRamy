const CACHE_NAME = 'finance-erp-v94'; // upgraded from CACHE_NAME = 'finance-erp-v16' and v93
const ASSETS_TO_CACHE = [
  './finance.html',
  './css/finance.css',
  './css/finance2.css',
  './css/tailwind.js',
  './manifest.json',
  './js/core/core-firebase.js',
  './js/core/core-session-guard.js',
  './js/core/core-save-guard.js',
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
  './js/inventory/inventory-products.js',
  './js/inventory/inventory-purchase.js',
  './js/inventory/inventory-ui.js',
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
