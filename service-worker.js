const CACHE_NAME = "butterbean-v6"; // bump this on each deploy

// Core shell files
const FILES_TO_CACHE = [
  "/",
  "/index.html",   // install screen
  "/app.html",     // main app
  "/manifest.json",
  "/home.html",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/staff.html"    // keep if you use the staff console; otherwise remove
];

// INSTALL – pre-cache core assets
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

// ACTIVATE – clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Navigation requests (address bar, home-screen launch, links)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh page for offline use
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const url = new URL(event.request.url);

          // If app.html was requested and we're offline, try cached app.html
          if (url.pathname.endsWith("/app.html")) {
            const appCache = await caches.match("/app.html");
            if (appCache) return appCache;
          }

          // Fallback: cached install page
          return caches.match("/index.html");
        })
    );
    return;
  }

  // Static assets – cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => {
        // As a very last resort, show install page if available
        return caches.match("/index.html");
      });
    })
  );
});

