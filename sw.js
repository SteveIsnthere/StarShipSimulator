/*
 * Rollback bridge. If the site is rolled back to the 2021 game, visitors who
 * already have the rebuild's worker (sw.js, cache-first) would keep being
 * served the rebuild. Its update check fetches this URL: delete the rebuild's
 * caches (starship-*) only, unregister, and reload each page onto this build.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('starship-')) await caches.delete(key);
      }
      await self.registration.unregister();
      const pages = await self.clients.matchAll({ type: 'window' });
      await Promise.all(pages.map((client) => client.navigate(client.url)));
    })(),
  );
});
