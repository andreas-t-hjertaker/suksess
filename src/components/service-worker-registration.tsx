"use client";

/**
 * Serwist Service Worker-registrering for PWA offline-støtte (#116)
 *
 * Bruker @serwist/window for automatisk registrering, oppdatering
 * og livssyklusadministrasjon av service workeren.
 */

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Dynamisk import for å unngå SSR-problemer
    async function registerSW() {
      try {
        const { Serwist } = await import("@serwist/window");
        const sw = new Serwist("/sw.js", { scope: "/", type: "classic" });

        sw.addEventListener("installed", (event) => {
          if (!event.isUpdate) {
            console.log("[Serwist] Service worker installert for første gang");
          }
        });

        sw.addEventListener("waiting", () => {
          // Ny versjon venter — be om aktivering
          console.log("[Serwist] Ny service worker venter på aktivering");
          sw.messageSkipWaiting();
        });

        sw.addEventListener("controlling", () => {
          console.log("[Serwist] Service worker har tatt kontroll");
        });

        await sw.register();
        console.log("[Serwist] Service worker registrert");
      } catch (err) {
        console.warn("[Serwist] Registrering feilet:", err);
      }
    }

    // Registrer etter at siden er ferdig lastet
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW, { once: true });
    }
  }, []);

  return null;
}
