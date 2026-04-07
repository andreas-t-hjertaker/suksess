import { useState } from "react";
import { useGrades } from "@/hooks/use-grades";
import { useXp } from "@/hooks/use-xp";
import { showToast } from "@/lib/toast";
import type { Grade } from "@/types/domain";

const CURRENT_YEAR = new Date().getFullYear();

export function useGradeForm() {
  const { grades, loading, error, addGrade, removeGrade } = useGrades();
  const { earnXp } = useXp();

  // Legg til ny karakter
  const [newSubject, setNewSubject] = useState("");
  const [newFagkode, setNewFagkode] = useState("");
  const [newGrade, setNewGrade] = useState<number>(4);
  const [newTerm, setNewTerm] = useState<"vt" | "ht">("ht");
  const [newYear, setNewYear] = useState(CURRENT_YEAR);
  const [adding, setAdding] = useState(false);

  // Simulator
  const [simSubject, setSimSubject] = useState("");
  const [simGrade, setSimGrade] = useState<number>(6);

  // Studiesøk
  const [search, setSearch] = useState("");

  async function handleAddGrade() {
    if (!newSubject.trim()) return;
    setAdding(true);
    try {
      await addGrade({
        subject: newSubject.trim(),
        fagkode: newFagkode.trim() || null,
        grade: newGrade as Grade["grade"],
        term: newTerm,
        year: newYear,
        programSubjectId: null,
      });
      earnXp("grades_added");
      setNewSubject("");
      setNewFagkode("");
      setNewGrade(4);
    } catch {
      showToast.error("Kunne ikke lagre karakter. Prøv igjen.");
    } finally {
      setAdding(false);
    }
  }

  return {
    // Data from useGrades
    grades,
    loading,
    error,
    removeGrade,

    // Form state
    newSubject,
    setNewSubject,
    newFagkode,
    setNewFagkode,
    newGrade,
    setNewGrade,
    newTerm,
    setNewTerm,
    newYear,
    setNewYear,
    adding,
    handleAddGrade,

    // Simulator state
    simSubject,
    setSimSubject,
    simGrade,
    setSimGrade,

    // Search state
    search,
    setSearch,
  };
}
