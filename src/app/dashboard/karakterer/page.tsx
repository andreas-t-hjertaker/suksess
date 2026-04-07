"use client";

import { useState, useMemo } from "react";
import { useGradeForm } from "@/hooks/use-grade-form";
import {
  calculateGradePoints,
  calculateDualSystemPoints,
  getAdmissionSystem,
  simulateGradeChange,
  STUDY_PROGRAMS,
  type StudyProgramEntry,
  type AdmissionSystem,
} from "@/lib/grades/calculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GraduationCap,
  TrendingUp,
  FlaskConical,
  Calculator,
  Search,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";
import { StatCard } from "@/components/stat-card";
import { ProgramfagRisiko } from "./programfag-risiko";
import { StudyGroup } from "./study-group";
import { Delta } from "./delta";
import { SystemComparison } from "./system-comparison";

// ---------------------------------------------------------------------------
// Termin-valg
// ---------------------------------------------------------------------------
const TERMS = [
  { value: "vt", label: "Vår" },
  { value: "ht", label: "Høst" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function KaraktererPage() {
  const {
    grades,
    loading,
    error,
    removeGrade,
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
    simSubject,
    setSimSubject,
    simGrade,
    setSimGrade,
    search,
    setSearch,
  } = useGradeForm();

  // SO-reform: avgangskull og aktivt system (Issue #114)
  const [graduationYear, setGraduationYear] = useState<number>(CURRENT_YEAR + 1);
  const activeSystem: AdmissionSystem = getAdmissionSystem(graduationYear);

  // ---------------------------------------------------------------------------
  // Beregnede verdier
  // ---------------------------------------------------------------------------
  const points = useMemo(() => calculateGradePoints(grades), [grades]);
  const dualPoints = useMemo(
    () => calculateDualSystemPoints(grades, activeSystem),
    [grades, activeSystem]
  );

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

  const filteredPrograms = useMemo<StudyProgramEntry[]>(() => {
    const q = search.toLowerCase();
    return STUDY_PROGRAMS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.institution.toLowerCase().includes(q)
    );
  }, [search]);

  // Kategoriser studier
  const { reachable, almostReachable, outOfReach } = useMemo(() => {
    const tp = dualPoints.activeTotal;
    return {
      reachable: filteredPrograms.filter((p) => tp >= p.requiredPoints),
      almostReachable: filteredPrograms.filter(
        (p) => tp < p.requiredPoints && tp >= p.requiredPoints - 5
      ),
      outOfReach: filteredPrograms.filter((p) => tp < p.requiredPoints - 5),
    };
  }, [filteredPrograms, dualPoints.activeTotal]);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  if (loading) {
    return <PageSkeleton variant="form" cards={4} />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState
          message="Kunne ikke laste karakterer. Prøv igjen senere."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Karakterer</h1>
        <p className="text-muted-foreground">
          Registrer karakterene dine og se hvilke studier du kan komme inn på.
        </p>
      </div>

      {/* SO-reform: Avgangskull-velger (Issue #114) */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <span className="text-sm font-medium">Planlagt avgangskull:</span>
        <div className="flex gap-2">
          {[CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2, CURRENT_YEAR + 3].map((yr) => (
            <button
              key={yr}
              onClick={() => setGraduationYear(yr)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                graduationYear === yr
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border hover:bg-muted"
              )}
            >
              {yr}
            </button>
          ))}
        </div>
        <Badge variant={activeSystem === "reform-2028" ? "default" : "secondary"} className="ml-auto">
          {activeSystem === "reform-2028" ? "🆕 Reform 2028" : "📋 Gjeldende system"}
        </Badge>
        {activeSystem === "reform-2028" && (
          <p className="w-full text-xs text-muted-foreground">
            Nytt system: maks 4 tilleggspoeng (kun realfag + militærtjeneste). Alderspoeng og folkehøgskolepoeng er fjernet.
          </p>
        )}
      </div>

      {/* Poeng-oversikt */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Karaktersnitt"
          value={points.average > 0 ? points.average.toFixed(2) : "—"}
          sub={`${points.subjectCount} fag`}
        />
        <StatCard
          icon={Calculator}
          label="SO-poeng"
          value={points.quotaPoints > 0 ? points.quotaPoints.toFixed(1) : "—"}
          sub="Samordna opptak"
        />
        <StatCard
          icon={FlaskConical}
          label="Realfagspoeng"
          value={`+${dualPoints.sciencePoints}`}
          sub="Maks 4 poeng"
        />
        <StatCard
          icon={TrendingUp}
          label="Totalt"
          value={dualPoints.activeTotal > 0 ? dualPoints.activeTotal.toFixed(1) : "—"}
          sub={activeSystem === "reform-2028" ? "Reform 2028 (maks 64p)" : "Med tilleggspoeng (maks 74p)"}
          highlight
        />
      </div>

      {/* Sammenligning begge systemer */}
      <SystemComparison dualPoints={dualPoints} activeSystem={activeSystem} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Karakterregistrering */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mine karakterer</CardTitle>
            <CardDescription>Legg til fag og karakterer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Skjema */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label htmlFor="grade-subject" className="sr-only">Fagnavn</label>
                  <Input
                    id="grade-subject"
                    placeholder="Fagnavn, f.eks. Matematikk R2"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <label htmlFor="grade-fagkode" className="sr-only">Fagkode</label>
                <Input
                  id="grade-fagkode"
                  placeholder="Fagkode (valgfritt, f.eks. MAT3206)"
                  value={newFagkode}
                  onChange={(e) => setNewFagkode(e.target.value.toUpperCase())}
                  className="col-span-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                {/* Karakter 1–6 */}
                <div className="space-y-1">
                  <span id="karakter-label" className="text-xs text-muted-foreground">Karakter</span>
                  <div className="flex gap-1" role="group" aria-labelledby="karakter-label">
                    {([1, 2, 3, 4, 5, 6] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setNewGrade(g)}
                        className={cn(
                          "h-8 w-8 rounded border text-sm font-semibold transition-colors",
                          newGrade === g
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Termin */}
                <div className="space-y-1">
                  <span id="termin-label" className="text-xs text-muted-foreground">Termin</span>
                  <div className="flex gap-1" role="group" aria-labelledby="termin-label">
                    {TERMS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setNewTerm(t.value)}
                        className={cn(
                          "h-8 rounded border px-2 text-sm font-medium transition-colors",
                          newTerm === t.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* År */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="grade-year">År</label>
                  <select
                    id="grade-year"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAddGrade}
                disabled={!newSubject.trim() || adding}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Legg til
              </Button>
            </div>

            {/* Liste */}
            {grades.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Ingen karakterer registrert ennå.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {grades.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{g.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.term === "vt" ? "Vår" : "Høst"} {g.year}
                        {g.fagkode && ` · ${g.fagkode}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={g.grade >= 4 ? "default" : "secondary"}
                        className="w-7 justify-center"
                      >
                        {g.grade}
                      </Badge>
                      <button
                        onClick={() => removeGrade(g.id)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Slett ${g.subject}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hva-om-simulator */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Hva-om-simulator</CardTitle>
            </div>
            <CardDescription>
              Se hva som skjer med poengene dine hvis du forbedrer en karakter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {grades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Registrer karakterer for å bruke simulatoren.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="sim-subject">Velg fag</label>
                  <select
                    id="sim-subject"
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Velg fag...</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.subject}>
                        {g.subject} (nå: {g.grade})
                      </option>
                    ))}
                  </select>
                </div>

                {simSubject && (
                  <div className="space-y-2">
                    <label id="ny-karakter-label" htmlFor="ny-karakter-group" className="text-sm font-medium">Ny karakter</label>
                    <div id="ny-karakter-group" className="flex gap-1" role="group" aria-labelledby="ny-karakter-label">
                      {([1, 2, 3, 4, 5, 6] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => setSimGrade(g)}
                          className={cn(
                            "h-9 flex-1 rounded border text-sm font-semibold transition-colors",
                            simGrade === g
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {simPoints && (
                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Simulert resultat
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Snitt</p>
                        <p className="text-lg font-bold">{simPoints.average.toFixed(2)}</p>
                        <Delta current={points.average} simulated={simPoints.average} decimals={2} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SO-poeng</p>
                        <p className="text-lg font-bold">{simPoints.quotaPoints.toFixed(1)}</p>
                        <Delta current={points.quotaPoints} simulated={simPoints.quotaPoints} decimals={1} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Realfagspoeng</p>
                        <p className="text-lg font-bold">+{simPoints.sciencePoints}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Totalt</p>
                        <p className="text-lg font-bold text-primary">{simPoints.totalPoints.toFixed(1)}</p>
                        <Delta current={dualPoints.activeTotal} simulated={simPoints.totalPoints} decimals={1} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Programfag-risikoanalyse */}
      {grades.length > 0 && (
        <ProgramfagRisiko grades={grades} />
      )}

      {/* Studieoversikt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Studiemuligheter</CardTitle>
              <CardDescription>
                Basert på {dualPoints.activeTotal.toFixed(1)} SO-poeng ({activeSystem === "reform-2028" ? "Reform 2028" : "Gjeldende system"})
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk studier..."
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Søk studier"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dualPoints.activeTotal === 0 && (
            <p className="text-sm text-muted-foreground">
              Registrer karakterer for å se hvilke studier du kan komme inn på.
            </p>
          )}

          {reachable.length > 0 && (
            <StudyGroup
              title="Du kan komme inn"
              variant="success"
              programs={reachable}
              userPoints={dualPoints.activeTotal}
            />
          )}

          {almostReachable.length > 0 && (
            <StudyGroup
              title="Nær grensen (< 5 poeng)"
              variant="warning"
              programs={almostReachable}
              userPoints={dualPoints.activeTotal}
            />
          )}

          {outOfReach.length > 0 && search && (
            <StudyGroup
              title="Trenger flere poeng"
              variant="neutral"
              programs={outOfReach}
              userPoints={dualPoints.activeTotal}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

