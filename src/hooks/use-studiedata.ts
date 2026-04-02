"use client";

/**
 * useStudiedata — hook for å hente ekte studiedata koblet til brukerens RIASEC-profil
 * Issue #52
 *
 * Bruker Firestore-cached data fra utdanning.no/DBH for:
 * - Anbefalte studieprogram basert på RIASEC
 * - Poenggrenser for relevante utdanninger
 */

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { StudieprogramSOSchema } from "@/types/schemas";
import type { StudieprogramSO } from "@/lib/studiedata/utdanning-no-client";

type StudiedataState = {
  programs: StudieprogramSO[];
  loading: boolean;
  error: string | null;
};

/**
 * Henter studieprogram fra Firestore (ingestet av Cloud Function fra utdanning.no).
 * Filtrerer basert på brukerens RIASEC-profil.
 */
export function useStudiedata(): StudiedataState {
  const { firebaseUser } = useAuth();
  const [state, setState] = useState<StudiedataState>({
    programs: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!firebaseUser) {
      setState({ programs: [], loading: false, error: null });
      return;
    }

    const uid = firebaseUser.uid;

    async function loadStudiedata() {
      try {
        // Hent brukerens RIASEC-profil
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        const riasecCode = profileSnap.exists()
          ? (profileSnap.data().riasec?.primaryCode as string | null)
          : null;

        if (!riasecCode) {
          setState({ programs: [], loading: false, error: null });
          return;
        }

        // Hent studieprogram fra Firestore (ingestet fra utdanning.no)
        const primaryCode = riasecCode.charAt(0).toUpperCase();
        const q = query(
          collection(db, "studyPrograms"),
          where("riasecCodes", "array-contains", primaryCode),
          limit(20)
        );
        const snap = await getDocs(q);
        const programs = snap.docs.reduce<StudieprogramSO[]>((acc, d) => {
          const result = StudieprogramSOSchema.safeParse(d.data());
          if (result.success) {
            acc.push(result.data as StudieprogramSO);
          } else {
            console.warn(`[useStudiedata] Valideringsfeil for ${d.ref.path}:`, result.error);
          }
          return acc;
        }, []);

        setState({ programs, loading: false, error: null });
      } catch (err) {
        setState({
          programs: [],
          loading: false,
          error: err instanceof Error ? err.message : "Feil ved henting av studiedata",
        });
      }
    }

    loadStudiedata();
  }, [firebaseUser]);

  return state;
}
