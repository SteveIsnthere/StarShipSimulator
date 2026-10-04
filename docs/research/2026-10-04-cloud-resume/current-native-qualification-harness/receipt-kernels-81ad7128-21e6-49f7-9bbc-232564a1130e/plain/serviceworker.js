/*
 * Retires the 2021 game's service worker. Returning visitors have it installed
 * at this URL, and its update check fetches this file: install it, delete the
 * 2021 cache, unregister, and reload each open page onto the new app. It never
 * answers a fetch. Not part of the new app's precache (scripts/build-sw.mjs).
 *
 * Only the 2021 cache ('v2', its one name in git history) is deleted: the
 * origin is shared with every other project site on steveisnthere.github.io,
 * and the new app's own 'starship-*' cache may already be filling.
 */
const CLASSIC_CACHES = ['v2'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (CLASSIC_CACHES.includes(key)) await caches.delete(key);
      }
      await self.registration.unregister();
      const pages = await self.clients.matchAll({ type: 'window' });
      // allSettled: one page that cannot be navigated must not stop the rest.
      await Promise.allSettled(pages.map((client) => client.navigate(client.url)));
    })(),
  );
});
