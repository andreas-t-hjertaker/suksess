"use client";

/**
 * useRealtimeSchoolStats — real-time Firestore listener for skolestatistikker
 * Brukes av rådgiverportalen for live oppdatering av frafallsrisiko og aktivitet.
 * Issue #40
 */

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import type { SchoolStatsDocument } from "@/lib/firebase/firestore-types";

export type SchoolStatsState = {
  stats: SchoolStatsDocument | null;
  loading: boolean;
  error: string | null;
};

/**
 * Abonnerer på schoolStats/{tenantId} i sanntid.
 * Oppdateres når Cloud Function kjører aggregering (hvert 30. minutt).
 */
export function useRealtimeSchoolStats(): SchoolStatsState {
  const { firebaseUser } = useAuth();
  const [state, setState] = useState<SchoolStatsState>({
    stats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const tenantId = (firebaseUser as { tenantId?: string } | null)?.tenantId;
    if (!tenantId) {
      setState({ stats: null, loading: false, error: null });
      return;
    }

    const ref = doc(db, "schoolStats", tenantId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setState({ stats: snap.data() as SchoolStatsDocument, loading: false, error: null });
        } else {
          setState({ stats: null, loading: false, error: null });
        }
      },
      (err) => {
        console.error("useRealtimeSchoolStats:", err);
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    );

    return unsub;
  }, [(firebaseUser as { tenantId?: string } | null)?.tenantId]);

  return state;
}
