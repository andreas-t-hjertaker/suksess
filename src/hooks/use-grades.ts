"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import type { Grade } from "@/types/domain";

export type GradeWithId = Grade & { id: string };

export function useGrades() {
  const { firebaseUser } = useAuth();
  const [grades, setGrades] = useState<GradeWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setGrades([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", firebaseUser.uid, "grades"),
      orderBy("year", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const newGrades = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Grade) }));
      setGrades(newGrades);
      setLoading(false);

      // Denormaliser karaktersnitt til user-dokument for admin-statistikk
      const graded = newGrades.filter((g) => typeof g.grade === "number");
      const avg = graded.length > 0
        ? Math.round((graded.reduce((s, g) => s + g.grade, 0) / graded.length) * 100) / 100
        : 0;
      updateDoc(doc(db, "users", firebaseUser.uid), {
        gradeAverage: avg,
        updatedAt: serverTimestamp(),
      }).catch(() => {}); // Stilhetsfeil — ikke kritisk
    });

    return unsub;
  }, [firebaseUser]);

  const addGrade = useCallback(
    async (grade: Omit<Grade, "createdAt" | "updatedAt" | "userId">) => {
      if (!firebaseUser) return;
      const ref = doc(collection(db, "users", firebaseUser.uid, "grades"));
      await setDoc(ref, {
        ...grade,
        userId: firebaseUser.uid,
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

  return { grades, loading, addGrade, removeGrade };
}
