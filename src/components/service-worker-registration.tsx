"use client";

/**
 * Service Worker-registrering for PWA offline-støtte og push-varsler.
 * Issue #31 (SW/PWA), Issue #30 (push notifications)
 */

import { useEffect } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";

/** VAPID public key — sett i miljøvariabel for produksjon */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

export function ServiceWorkerRegistration() {
  const { firebaseUser } = useAuth();

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

  // Abonner på push-varsler dersom brukeren har aktivert det i innstillinger
  useEffect(() => {
    if (!firebaseUser || typeof window === "undefined" || !VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      try {
        // Sjekk om brukeren har aktivert push-varsler i prefs
        const prefsDoc = await getDoc(doc(db, "users", firebaseUser.uid, "prefs", "notifications"));
        if (!prefsDoc.exists() || !prefsDoc.data()?.pushEnabled) return;

        const permission = Notification.permission;
        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // Allerede abonnert

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // Lagre push-abonnement i Firestore for bruk av Cloud Functions
        await setDoc(doc(db, "users", firebaseUser.uid, "prefs", "pushSubscription"), {
          subscription: JSON.parse(JSON.stringify(subscription)),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Stille feil — push er ikke kritisk
      }
    })();
  }, [firebaseUser]);

  return null;
}
