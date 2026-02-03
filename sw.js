// Service Worker for cache-busting JS modules
// Adds timestamp to all /js/*.js requests to ensure fresh files

const CACHE_VERSION = 1;

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Only intercept JS files in /js/ directory
    if (url.pathname.startsWith('/js/') && url.pathname.endsWith('.js')) {
        // Add cache-busting timestamp (changes every hour to allow some caching)
        const hourTimestamp = Math.floor(Date.now() / 3600000);
        url.searchParams.set('_cb', hourTimestamp);
        
        event.respondWith(
            fetch(url, { cache: 'no-cache' })
                .catch(() => fetch(event.request))
        );
        return;
    }
    
    // Pass through all other requests
    event.respondWith(fetch(event.request));
});
