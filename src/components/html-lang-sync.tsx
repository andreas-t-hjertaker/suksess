"use client";

/**
 * Synkroniserer HTML lang-attributt med brukerens valgte språk (#131).
 *
 * Siden Next.js med static export krever en hardkodet lang i layout,
 * oppdaterer denne komponenten <html lang="..."> klient-side basert
 * på brukerens lokale-valg fra useLocale().
 */

import { useEffect } from "react";
import { useLocale } from "@/hooks/use-locale";

export function HtmlLangSync() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
