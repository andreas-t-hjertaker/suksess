"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { parseDocsWithId } from "@/lib/firebase/parse-doc";
import { GradeSchema } from "@/types/schemas";
import { useAuth } from "@/hooks/use-auth";
import type { Grade } from "@/types/domain";

export type GradeWithId = Grade & { id: string };

export function useGrades() {
  const { firebaseUser } = useAuth();
  const [grades, setGrades] = useState<GradeWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setGrades([]);
      setLoading(false);
      return;
    }

    setError(null);
    const q = query(
      collection(db, "users", firebaseUser.uid, "grades"),
      orderBy("year", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setGrades(parseDocsWithId(snap.docs, GradeSchema) as GradeWithId[]);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsub;
  }, [firebaseUser]);

  const addGrade = useCallback(
    async (grade: Omit<Grade, "createdAt" | "updatedAt" | "userId">) => {
      if (!firebaseUser) return;
      const ref = doc(collection(db, "users", firebaseUser.uid, "grades"));
      await setDoc(ref, {
        ...grade,
        userId: firebaseUser.uid,
        source: "manual",
        nvbImportedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [firebaseUser]
  );

  const removeGrade = useCallback(
    async (gradeId: string) => {
      if (!firebaseUser) return;
      await deleteDoc(doc(db, "users", firebaseUser.uid, "grades", gradeId));
    },
    [firebaseUser]
  );

  return { grades, loading, error, addGrade, removeGrade };
}
