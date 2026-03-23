"use client";

import { useEffect } from "react";
import { initAppCheck } from "@/lib/firebase/app-check";

/**
 * Initialiser Firebase App Check tidlig i app-livsyklusen.
 * Renderes som en usynlig komponent i layout.tsx.
 */
export function AppCheckProvider() {
  useEffect(() => {
    initAppCheck();
  }, []);

  return null;
}
