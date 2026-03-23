"use client";

/**
 * useRealtimeStudents — sanntids Firestore listener for elevliste
 * Brukes av rådgiverportalen for live oppdatering av risikonivå og aktivitet.
 * Issue #40
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import type { DropoutRiskLevel } from "@/lib/risk/dropout-risk";

export type RealtimeStudent = {
  uid: string;
  displayName: string | null;
  email: string | null;
  lastLoginAt: Date | null;
  bigFiveCompleted: boolean;
  riskLevel: DropoutRiskLevel | null;
  riskScore: number | null;
  clusterId: string | null;
};

export type RealtimeStudentsState = {
  students: RealtimeStudent[];
  loading: boolean;
  error: string | null;
};

/**
 * Abonnerer på users-samlingen i sanntid, filtrert på tenantId.
 * Oppdateres umiddelbart når risikovurderinger endres i Firestore.
 *
 * @param maxStudents - Maks antall elever å laste (default 200)
 */
export function useRealtimeStudents(maxStudents = 200): RealtimeStudentsState {
  const { firebaseUser } = useAuth();
  const [state, setState] = useState<RealtimeStudentsState>({
    students: [],
    loading: true,
    error: null,
  });

  const tenantId = (firebaseUser as { tenantId?: string } | null)?.tenantId;

  useEffect(() => {
    if (!tenantId) {
      setState({ students: [], loading: false, error: null });
      return;
    }

    const q = query(
      collection(db, "users"),
      where("tenantId", "==", tenantId),
      orderBy("lastLoginAt", "desc"),
      limit(maxStudents)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const students: RealtimeStudent[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName ?? null,
            email: data.email ?? null,
            lastLoginAt: data.lastLoginAt?.toDate() ?? null,
            bigFiveCompleted: data.bigFiveCompleted ?? false,
            riskLevel: data.riskLevel ?? null,
            riskScore: data.riskScore ?? null,
            clusterId: data.clusterId ?? null,
          };
        });
        setState({ students, loading: false, error: null });
      },
      (err) => {
        console.error("useRealtimeStudents:", err);
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    );

    return unsub;
  }, [tenantId, maxStudents]);

  return state;
}
