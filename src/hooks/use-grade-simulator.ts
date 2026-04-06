"use client";

import { useState, useMemo } from "react";
import { simulateGradeChange } from "@/lib/grades/calculator";
import type { GradeWithId } from "@/hooks/use-grades";

export function useGradeSimulator(grades: GradeWithId[]) {
  const [simSubject, setSimSubject] = useState("");
  const [simGrade, setSimGrade] = useState<number>(6);

  const simPoints = useMemo(() => {
    if (!simSubject) return null;
    const current = grades.find((g) => g.subject === simSubject);
    if (!current) return null;
    return simulateGradeChange(grades, {
      subject: simSubject,
      currentGrade: current.grade,
      simulatedGrade: simGrade,
    });
  }, [grades, simSubject, simGrade]);

  return { simSubject, setSimSubject, simGrade, setSimGrade, simPoints };
}
