"use client";

import { useState, useMemo } from "react";
import { STUDY_PROGRAMS, type StudyProgramEntry } from "@/lib/grades/calculator";

export function useStudySearch(activeTotal: number) {
  const [search, setSearch] = useState("");

  const filteredPrograms = useMemo<StudyProgramEntry[]>(() => {
    const q = search.toLowerCase();
    return STUDY_PROGRAMS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.institution.toLowerCase().includes(q)
    );
  }, [search]);

  const { reachable, almostReachable, outOfReach } = useMemo(() => {
    return {
      reachable: filteredPrograms.filter((p) => activeTotal >= p.requiredPoints),
      almostReachable: filteredPrograms.filter(
        (p) => activeTotal < p.requiredPoints && activeTotal >= p.requiredPoints - 5
      ),
      outOfReach: filteredPrograms.filter((p) => activeTotal < p.requiredPoints - 5),
    };
  }, [filteredPrograms, activeTotal]);

  return { search, setSearch, reachable, almostReachable, outOfReach };
}
