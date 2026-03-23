"use client";

/**
 * useLocale — henter og setter appens språk.
 * Lagrer valgt språk i localStorage for persistens.
 */

import { useState, useCallback } from "react";
import { MESSAGES, SUPPORTED_LOCALES, type Locale, type Messages } from "@/lib/i18n/locales";

const LOCALE_KEY = "suksess-locale";

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "nb";
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === "nb" || stored === "nn" || stored === "se") return stored;
  // Sjekk nettleserens språk
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("nn")) return "nn";
  return "nb";
}

let _locale: Locale = "nb";
const _listeners = new Set<() => void>();

function getLocale(): Locale {
  if (typeof window !== "undefined") {
    _locale = getStoredLocale();
  }
  return _locale;
}

function setLocaleGlobal(locale: Locale) {
  _locale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
  }
  _listeners.forEach((fn) => fn());
}

export function useLocale(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  locales: typeof SUPPORTED_LOCALES;
} {
  const [, forceUpdate] = useState(0);

  // Subscribe to global locale changes
  const subscribe = useCallback(() => {
    const fn = () => forceUpdate((n) => n + 1);
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }, []);

  // Run subscribe once on mount
  useState(subscribe);

  const locale = getLocale();
  const t = MESSAGES[locale];

  return {
    locale,
    setLocale: setLocaleGlobal,
    t,
    locales: SUPPORTED_LOCALES,
  };
}
