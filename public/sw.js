/* Legacy PWA cleanup: this file intentionally does not cache or intercept requests. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => /will[-_ ]?design|workbox|vite[-_ ]?pwa|precache/i.test(name))
        .map((name) => caches.delete(name)),
    );
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: "LEGACY_SERVICE_WORKER_REMOVED" }));
  })());
});
