/**
 * Hook for karriereveier fra Firestore (Issue #52)
 *
 * Henter CareerNodes fra Firestore careerPaths/ collection.
 * Fallback til lokal CAREER_NODES hvis Firestore er tom.
 *
 * Firestore populeres fra:
 * - NAV-stillingsdata (etterspørsel og lønn oppdateres løpende)
 * - Admin-seed fra CAREER_NODES (én gang ved oppstart)
 */

"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase/config";
import { CAREER_NODES, type CareerNode } from "@/lib/karriere/data";

function db() { return getFirestore(app); }

type FirestoreCareerPath = {
  id: string;
  title: string;
  sector: string;
  educationLevel: string;
  riasecCodes: string[];
  medianSalary: number;
  demand: "high" | "medium" | "low";
  description: string;
  educationPaths?: string[];
  navJobCount?: number;
};

function firestoreToCareerNode(doc: FirestoreCareerPath): CareerNode {
  return {
    id: doc.id,
    title: doc.title,
    sector: doc.sector,
    educationLevel: doc.educationLevel as CareerNode["educationLevel"],
    riasecCodes: doc.riasecCodes as CareerNode["riasecCodes"],
    medianSalary: doc.medianSalary,
    demand: doc.demand,
    description: doc.description,
    educationPaths: doc.educationPaths ?? [],
  };
}

export function useKarrierePaths(): {
  careers: CareerNode[];
  loading: boolean;
  fromFirestore: boolean;
} {
  const [careers, setCareers] = useState<CareerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDocs(query(collection(db(), "careerPaths"), orderBy("title"), limit(500)))
      .then((snap) => {
        if (cancelled) return;

        if (!snap.empty) {
          const firestoreCareers = snap.docs.map((d) =>
            firestoreToCareerNode({ id: d.id, ...d.data() } as FirestoreCareerPath)
          );
          setCareers(firestoreCareers);
          setFromFirestore(true);
        } else {
          // Fallback til lokal data mens Firestore populeres
          setCareers(CAREER_NODES);
          setFromFirestore(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCareers(CAREER_NODES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { careers, loading, fromFirestore };
}

/**
 * Seed-funksjon: skriv CAREER_NODES til Firestore (for admin/init).
 * Kjøres én gang ved første oppsett — idempotent.
 */
export async function seedCareerPathsToFirestore(): Promise<number> {
  const { writeBatch, doc } = await import("firebase/firestore");
  const firestore = db();
  let written = 0;

  for (let i = 0; i < CAREER_NODES.length; i += 400) {
    const batch = writeBatch(firestore);
    for (const node of CAREER_NODES.slice(i, i + 400)) {
      batch.set(doc(collection(firestore, "careerPaths"), node.id), {
        title: node.title,
        sector: node.sector,
        educationLevel: node.educationLevel,
        riasecCodes: node.riasecCodes,
        medianSalary: node.medianSalary,
        demand: node.demand,
        description: node.description,
        educationPaths: node.educationPaths ?? [],
        source: "local-seed",
      });
      written++;
    }
    await batch.commit();
  }
  return written;
}
