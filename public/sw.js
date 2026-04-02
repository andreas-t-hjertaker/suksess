/**
 * Service Worker for Suksess PWA — offline-støtte og asset-cache
 * Issue #31, #102
 *
 * Strategi:
 *   Statiske assets (JS/CSS/fonts/bilder) → CacheFirst (30 dager)
 *   HTML-sider → StaleWhileRevalidate (viser cachet, oppdaterer i bakgrunnen)
 *   Firebase/API → NetworkOnly (krever nett)
 *   Offline → /offline.html fallback
 */

const CACHE_VERSION = 2;
const STATIC_CACHE = `suksess-static-v${CACHE_VERSION}`;
const PAGE_CACHE = `suksess-pages-v${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, PAGE_CACHE];

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Maks cache-alder i ms
const STATIC_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 dager
const PAGE_MAX_AGE = 24 * 60 * 60 * 1000; // 1 dag

// ---------------------------------------------------------------------------
// Install — pre-cache statiske ressurser + offline-side
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("[SW] Pre-cache feil (ikke-kritisk):", err);
      });
    })
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate — rydd opp gamle cacher
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Fetch — strategi basert på ressurstype
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Kun håndter HTTP(S) GET-forespørsler
  if (event.request.method !== "GET") return;

  // NetworkOnly for Firebase/API/eksterne tjenester
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("weaviate") ||
    url.hostname.includes("sentry.io") ||
    url.hostname.includes("posthog") ||
    url.hostname.includes("stripe") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // CacheFirst for statiske assets (JS, CSS, bilder, fonter)
  if (isStaticAsset(event.request)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // StaleWhileRevalidate for HTML-navigasjon
  if (event.request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
});

// ---------------------------------------------------------------------------
// Cache-strategier
// ---------------------------------------------------------------------------

/** CacheFirst — bruk cache, fallback til nettverk */
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

/** StaleWhileRevalidate — vis cachet side, oppdater i bakgrunnen */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Vis cachet versjon umiddelbart, oppdater i bakgrunnen
  if (cached) {
    fetchPromise; // trigger bakgrunnsoppdatering
    return cached;
  }

  // Ingen cache — vent på nettverk, fallback til offline-side
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;

  // Vis offline-side
  const offlinePage = await caches.match("/offline.html");
  return offlinePage || new Response("Offline", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------

function isStaticAsset(request) {
  const dest = request.destination;
  return (
    dest === "script" ||
    dest === "style" ||
    dest === "image" ||
    dest === "font" ||
    dest === "manifest"
  );
}
