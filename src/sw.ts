/**
 * Serwist Service Worker for Suksess PWA (#116)
 *
 * Migrert fra vanilla sw.js til Serwist-managed service worker med:
 * - Automatisk precaching av statiske assets via __WB_MANIFEST
 * - Differensierte caching-strategier per ressurstype
 * - Offline fallback for navigasjonsforespørsler
 * - Firebase/API network-only policy
 * - Push-notifikasjoner
 * - Background sync forberedelse
 */

/// <reference lib="webworker" />

import { Serwist, type RuntimeCaching } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
  ExpirationPlugin,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ---------------------------------------------------------------------------
// Offline fallback HTML (innebygd — ingen ekstra fil nødvendig)
// ---------------------------------------------------------------------------

const OFFLINE_HTML = `<!DOCTYPE html><html lang="nb"><head><meta charset="utf-8"><title>Suksess – Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b;text-align:center;padding:2rem}h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#64748b;max-width:24rem}button{margin-top:1rem;padding:0.5rem 1.5rem;border-radius:0.5rem;border:none;background:#7c3aed;color:white;cursor:pointer;font-size:0.875rem}</style></head><body><div><h1>Du er offline</h1><p>Suksess trenger internettforbindelse for å fungere. Sjekk tilkoblingen din og prøv igjen.</p><button onclick="location.reload()">Prøv igjen</button></div></body></html>`;

// ---------------------------------------------------------------------------
// Runtime caching — Suksess-tilpassede strategier
// ---------------------------------------------------------------------------

const runtimeCaching: RuntimeCaching[] = [
  // Firebase og eksterne API-er: alltid nettverk (ingen cache)
  {
    matcher: ({ url }) =>
      url.hostname.includes("firestore.googleapis.com") ||
      url.hostname.includes("firebase") ||
      url.hostname.includes("identitytoolkit.googleapis.com") ||
      url.hostname.includes("securetoken.googleapis.com") ||
      url.hostname.includes("sentry.io") ||
      url.hostname.includes("posthog"),
    handler: new NetworkOnly(),
  },

  // Lokale fonter: cache-first med lang levetid
  {
    matcher: /\.(?:woff|woff2|eot|ttf|otf)$/i,
    handler: new CacheFirst({
      cacheName: "suksess-fonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 16,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 år
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },

  // Bilder: stale-while-revalidate
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "suksess-images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dager
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },

  // Next.js statiske JS-chunks: cache-first (immutable hashes)
  {
    matcher: /\/_next\/static\/.+\.js$/i,
    handler: new CacheFirst({
      cacheName: "suksess-next-js",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dager
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },

  // CSS: stale-while-revalidate
  {
    matcher: /\.(?:css)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "suksess-styles",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dager
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },

  // Øvrig JS (ikke Next.js-chunks): stale-while-revalidate
  {
    matcher: /\.(?:js)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "suksess-js",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 24 * 60 * 60, // 24 timer
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },

  // JSON/data: network-first
  {
    matcher: /\.(?:json|xml|csv)$/i,
    handler: new NetworkFirst({
      cacheName: "suksess-data",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 timer
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },

  // Same-origin navigasjon: network-first med offline fallback
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "suksess-pages",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 timer
        }),
      ],
      networkTimeoutSeconds: 5,
    }),
  },

  // Cross-origin: network-first med timeout
  {
    matcher: ({ sameOrigin }) => !sameOrigin,
    handler: new NetworkFirst({
      cacheName: "suksess-cross-origin",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 60 * 60, // 1 time
        }),
      ],
      networkTimeoutSeconds: 10,
    }),
  },
];

// ---------------------------------------------------------------------------
// Initialiser Serwist
// ---------------------------------------------------------------------------

const serwist = new Serwist({
  // Precache-manifest injiseres av @serwist/next under bygging
  precacheEntries: self.__WB_MANIFEST || [],
  precacheOptions: {
    cleanupOutdatedCaches: true,
    concurrency: 10,
  },
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

serwist.addEventListeners();

// ---------------------------------------------------------------------------
// Push-notifikasjoner
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
  const url = (event.notification.data?.url as string) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
