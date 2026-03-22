"use client";

/**
 * Service Worker-registrering for PWA offline-støtte (issue #31)
 */

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Registrer SW etter at siden er lastet
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Registrert:", registration.scope);
        })
        .catch((err) => {
          console.warn("[SW] Registrering feilet:", err);
        });
    });
  }, []);

  return null;
}
