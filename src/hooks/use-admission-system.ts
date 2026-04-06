"use client";

import { useState, useMemo } from "react";
import {
  calculateGradePoints,
  calculateDualSystemPoints,
  getAdmissionSystem,
  type AdmissionSystem,
} from "@/lib/grades/calculator";
import type { GradeWithId } from "@/hooks/use-grades";

const CURRENT_YEAR = new Date().getFullYear();

export function useAdmissionSystem(grades: GradeWithId[]) {
  const [graduationYear, setGraduationYear] = useState<number>(CURRENT_YEAR + 1);
  const activeSystem: AdmissionSystem = getAdmissionSystem(graduationYear);
  const [showBothSystems, setShowBothSystems] = useState(false);

  const points = useMemo(() => calculateGradePoints(grades), [grades]);
  const dualPoints = useMemo(
    () => calculateDualSystemPoints(grades, activeSystem),
    [grades, activeSystem]
  );

  return {
    graduationYear, setGraduationYear,
    activeSystem,
    showBothSystems, setShowBothSystems,
    points,
    dualPoints,
  };
}
