/**
 * DENNE FILEN GENERERES AUTOMATISK AV @serwist/next UNDER BYGGING.
 *
 * Kildekode: src/sw.ts
 * Konfigurasjon: next.config.ts (withSerwist)
 *
 * I utviklingsmiljø (NODE_ENV !== "production") er service workeren deaktivert.
 * I produksjon kompilerer Serwist src/sw.ts med precache-manifest og
 * overskriver denne filen.
 *
 * Se issue #116 for detaljer.
 */

// Fallback for utvikling — Serwist er deaktivert i dev
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
