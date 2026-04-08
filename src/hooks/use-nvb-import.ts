"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Hook for NVB (Nasjonal vitnemålsdatabase) karakterimport (#147).
 *
 * Lar elever importere offisielle VGS-karakterer fra NVB
 * via Feide-autentisering.
 */

type NvbImportResult = {
  imported: number;
  skipped: number;
  vitnemal: number;
  errors: string[];
};

type NvbStatus = {
  hasNvbGrades: boolean;
  lastImported: string | null;
};

export function useNvbImport() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NvbImportResult | null>(null);
  const [status, setStatus] = useState<NvbStatus | null>(null);

  const getApiUrl = useCallback(() => {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "suksess-842ed";
    const region = process.env.NEXT_PUBLIC_REGION || "europe-west1";
    return `https://${region}-${projectId}.cloudfunctions.net/api`;
  }, []);

  /**
   * Importer karakterer fra NVB.
   * Krever at brukeren er logget inn med Feide og har et gyldig access_token.
   */
  const importGrades = useCallback(
    async (feideAccessToken: string) => {
      if (!firebaseUser) {
        setError("Du må være logget inn for å importere karakterer.");
        return null;
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await fetch(`${getApiUrl()}/nvb/import`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ feideAccessToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Kunne ikke importere karakterer fra NVB");
        }

        const importResult = data.data as NvbImportResult;
        setResult(importResult);
        return importResult;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Ukjent feil ved NVB-import";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [firebaseUser, getApiUrl]
  );

  /**
   * Sjekk om brukeren allerede har importerte NVB-karakterer.
   */
  const checkStatus = useCallback(async () => {
    if (!firebaseUser) return;

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`${getApiUrl()}/nvb/status`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setStatus(data.data as NvbStatus);
      }
    } catch {
      // Stille feil — status er ikke kritisk
    }
  }, [firebaseUser, getApiUrl]);

  return {
    importGrades,
    checkStatus,
    loading,
    error,
    result,
    status,
  };
}
