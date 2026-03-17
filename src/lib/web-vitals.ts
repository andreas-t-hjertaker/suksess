"use client";

import { trackEvent } from "@/lib/firebase/analytics";

type WebVitalMetric = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
};

/** Rapporter en web vital-metrikk til Firebase Analytics */
export function reportWebVitals(metric: WebVitalMetric) {
  trackEvent("web_vital", {
    metric_name: metric.name,
    metric_value: Math.round(metric.value),
    metric_rating: metric.rating,
  });
}

/**
 * Observer web vitals via PerformanceObserver API.
 * Bruker ingen eksterne avhengigheter — leser direkte fra nettleseren.
 */
export function observeWebVitals() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  // LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        reportWebVitals({
          name: "LCP",
          value: last.startTime,
          rating: last.startTime <= 2500 ? "good" : last.startTime <= 4000 ? "needs-improvement" : "poor",
        });
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Ikke støttet i denne nettleseren
  }

  // FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        const delay = fidEntry.processingStart - fidEntry.startTime;
        reportWebVitals({
          name: "FID",
          value: delay,
          rating: delay <= 100 ? "good" : delay <= 300 ? "needs-improvement" : "poor",
        });
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch {
    // Ikke støttet i denne nettleseren
  }

  // CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as LayoutShiftEntry).hadRecentInput) {
          clsValue += (entry as LayoutShiftEntry).value;
        }
      }
      reportWebVitals({
        name: "CLS",
        value: clsValue,
        rating: clsValue <= 0.1 ? "good" : clsValue <= 0.25 ? "needs-improvement" : "poor",
      });
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // Ikke støttet i denne nettleseren
  }
}

// Typer som mangler i TypeScript sine standard-definisjoner
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}
