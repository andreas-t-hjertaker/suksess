/**
 * Service Worker for Suksess PWA — offline-støtte og statisk asset-cache
 * (Issue #102, #116)
 *
 * Strategier:
 * - Cache-first for statiske assets (JS, CSS, bilder, fonter)
 * - Network-first for navigasjon med offline fallback
 * - Network-only for Firebase/API-kall
 * - Stale-while-revalidate for CDN-ressurser
 * - Bakgrunnssynk for offline-handlinger (fremtidig)
 */

const CACHE_VERSION = 2;
const STATIC_CACHE = `suksess-static-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `suksess-runtime-v${CACHE_VERSION}`;
const OFFLINE_PAGE = "/offline";

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// ---------------------------------------------------------------------------
// Install — pre-cache statiske ressurser
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignorer feil ved pre-caching (ressurser finnes kanskje ikke ennå)
      });
    })
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — rydd opp gamle cacher
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  const validCaches = [STATIC_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Fetch — differensiert caching-strategi
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ikke cache Firebase/API-kall — network only
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("sentry.io") ||
    url.hostname.includes("posthog") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Cache-first for statiske assets (JS, CSS, bilder, fonter)
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "image" ||
    event.request.destination === "font"
  ) {
    event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
    return;
  }

  // Network-first for navigasjon med offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // Stale-while-revalidate for øvrige GET-forespørsler
  if (event.request.method === "GET") {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
  }
});

// ---------------------------------------------------------------------------
// Caching-strategier
// ---------------------------------------------------------------------------

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Forsøk å returnere cached versjon
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback til cached startside
    const fallback = await caches.match("/");
    if (fallback) return fallback;

    return new Response(
      '<!DOCTYPE html><html lang="nb"><head><meta charset="utf-8"><title>Suksess – Offline</title>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        "<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b;text-align:center;padding:2rem}" +
        "h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#64748b;max-width:24rem}</style></head>" +
        "<body><div><h1>Du er offline</h1><p>Suksess trenger internettforbindelse for å fungere. Sjekk tilkoblingen din og prøv igjen.</p>" +
        '<button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;border-radius:0.5rem;border:none;background:#7c3aed;color:white;cursor:pointer;font-size:0.875rem">Prøv igjen</button>' +
        "</div></body></html>",
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("Offline", { status: 503 });
}

// ---------------------------------------------------------------------------
// Push-notifikasjoner (forberedt for fremtidig bruk)
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "Suksess", {
        body: data.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || "default",
        data: { url: data.url || "/dashboard" },
      })
    );
  } catch {
    // Ugyldig push-data
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// ---------------------------------------------------------------------------
// SW-oppdateringsmelding til klient
// ---------------------------------------------------------------------------

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
