/**
 * Hook for studieprogram fra Firestore (Issue #52)
 *
 * Leser fra studyPrograms/ collection (populert av utdanning.no ingest).
 * Fallback til STUDY_PROGRAMS fra lib/grades/calculator ved tom database.
 */

"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase/config";
import { STUDY_PROGRAMS, type StudyProgramEntry } from "@/lib/grades/calculator";

function db() {
  return getFirestore(app);
}

export type FirestoreStudyProgram = {
  id: string;
  name: string;
  institution: string;
  level: string;
  nusCode: string;
  requiredGpa?: number;
  description?: string;
  url?: string;
  riasecCodes?: string[];
  tags?: string[];
  // Mapped from legacy StudyProgramEntry shape
  requiredPoints?: number;
  topPoints?: number;
};

/** Map Firestore doc to StudyProgramEntry fallback shape */
function toStudyProgramEntry(p: FirestoreStudyProgram): StudyProgramEntry {
  return {
    name: p.name,
    institution: p.institution,
    requiredPoints: p.requiredPoints ?? p.requiredGpa ?? 0,
    topPoints: p.topPoints ?? (p.requiredGpa ? p.requiredGpa + 3 : 0),
    url: p.url ?? "https://www.samordnaopptak.no",
  };
}

export function useStudyPrograms(maxResults = 500): {
  programs: StudyProgramEntry[];
  firestorePrograms: FirestoreStudyProgram[];
  loading: boolean;
  fromFirestore: boolean;
} {
  const [firestorePrograms, setFirestorePrograms] = useState<FirestoreStudyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDocs(query(
      collection(db(), "studyPrograms"),
      orderBy("name"),
      limit(maxResults)
    ))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.empty) {
          const mapped = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FirestoreStudyProgram, "id">),
          }));
          setFirestorePrograms(mapped);
          setFromFirestore(true);
        } else {
          setFromFirestore(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFromFirestore(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [maxResults]);

  const programs = fromFirestore
    ? firestorePrograms.map(toStudyProgramEntry)
    : STUDY_PROGRAMS;

  return { programs, firestorePrograms, loading, fromFirestore };
}
