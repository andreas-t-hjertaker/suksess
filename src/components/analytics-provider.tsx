"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/firebase/analytics";
import { hasConsent } from "@/components/consent-banner";
import { observeWebVitals } from "@/lib/web-vitals";

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Spor sidevisninger bare hvis brukeren har gitt samtykke
    if (hasConsent()) {
      trackPageView(pathname);
    }
  }, [pathname]);

  // Start web vitals-observering én gang ved oppstart
  useEffect(() => {
    if (hasConsent()) {
      observeWebVitals();
    }
  }, []);

  return null;
}
