"use client";

import { useState, useMemo } from "react";
import { useGrades } from "@/hooks/use-grades";
import { useXp } from "@/hooks/use-xp";
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
import { showToast } from "@/lib/toast";
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
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/page-skeleton";
import type { Grade } from "@/types/domain";

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
  const { grades, loading, addGrade, removeGrade } = useGrades();
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

  // SO-reform: avgangskull og aktivt system (Issue #114)
  const [graduationYear, setGraduationYear] = useState<number>(CURRENT_YEAR + 1);
  const activeSystem: AdmissionSystem = getAdmissionSystem(graduationYear);
  const [showBothSystems, setShowBothSystems] = useState(false);

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
  // Handlinger
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  if (loading) {
    return <PageSkeleton variant="form" cards={4} />;
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
        <PointCard
          icon={GraduationCap}
          label="Karaktersnitt"
          value={points.average > 0 ? points.average.toFixed(2) : "—"}
          sub={`${points.subjectCount} fag`}
        />
        <PointCard
          icon={Calculator}
          label="SO-poeng"
          value={points.quotaPoints > 0 ? points.quotaPoints.toFixed(1) : "—"}
          sub="Samordna opptak"
        />
        <PointCard
          icon={FlaskConical}
          label="Realfagspoeng"
          value={`+${dualPoints.sciencePoints}`}
          sub="Maks 4 poeng"
        />
        <PointCard
          icon={TrendingUp}
          label="Totalt"
          value={dualPoints.activeTotal > 0 ? dualPoints.activeTotal.toFixed(1) : "—"}
          sub={activeSystem === "reform-2028" ? "Reform 2028 (maks 64p)" : "Med tilleggspoeng (maks 74p)"}
          highlight
        />
      </div>

      {/* Sammenligning begge systemer */}
      <div className="rounded-lg border p-4 space-y-2">
        <button
          onClick={() => setShowBothSystems((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium hover:text-primary transition-colors"
        >
          <span>Sammenlign begge opptakssystemer</span>
          <span className="text-muted-foreground">{showBothSystems ? "▲ Skjul" : "▼ Vis"}</span>
        </button>
        {showBothSystems && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className={cn("rounded-lg border p-3 space-y-1", activeSystem === "legacy" && "border-primary bg-primary/5")}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gjeldende system (→ 2027) {activeSystem === "legacy" && "✓ Ditt system"}
              </p>
              <p className="text-2xl font-bold">{dualPoints.totalLegacy.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Realfag: +{dualPoints.legacy.sciencePoints} · Alder: +{dualPoints.legacy.agePoints} · Militær: +{dualPoints.legacy.military} · Folkehøgskole: +{dualPoints.legacy.folkHighSchool}</p>
              <p className="text-xs text-muted-foreground">Maks 14 tilleggspoeng</p>
            </div>
            <div className={cn("rounded-lg border p-3 space-y-1", activeSystem === "reform-2028" && "border-primary bg-primary/5")}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reform 2028 (→) {activeSystem === "reform-2028" && "✓ Ditt system"}
              </p>
              <p className="text-2xl font-bold">{dualPoints.totalReform.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Realfag: +{dualPoints.reform.sciencePoints} · Militær: +{dualPoints.reform.military}</p>
              <p className="text-xs text-muted-foreground">Maks 4 tilleggspoeng — alderspoeng og folkehøgskolepoeng fjernet</p>
            </div>
          </div>
        )}
      </div>

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
                  <Input
                    placeholder="Fagnavn, f.eks. Matematikk R2"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <Input
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
                    <span id="ny-karakter-label" className="text-sm font-medium">Ny karakter</span>
                    <div className="flex gap-1" role="group" aria-labelledby="ny-karakter-label">
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

// ---------------------------------------------------------------------------
// Programfag-risikoanalyse (issue #10)
// ---------------------------------------------------------------------------

const KEY_SUBJECTS: { name: string; fagkode: string; required: string[] }[] = [
  {
    name: "Matematikk R2 (for tekniske studier)",
    fagkode: "MAT3206",
    required: ["Sivilingeniør, datateknikk", "Sivilingeniør, elektronikk", "Informatikk (bachelor)", "Fysikk (bachelor)", "Matematikk (bachelor)"],
  },
  {
    name: "Matematikk R1 (for mange studier)",
    fagkode: "MAT3205",
    required: ["Sivilingeniør, bygg- og miljøteknikk", "Farmasi (master)", "Informatikk (bachelor)"],
  },
  {
    name: "Fysikk (for ingeniørstudier)",
    fagkode: "FYS3101",
    required: ["Sivilingeniør, datateknikk", "Sivilingeniør, elektronikk"],
  },
  {
    name: "Kjemi (for medisin/farmasi)",
    fagkode: "KJE3101",
    required: ["Medisin", "Farmasi (master)", "Odontologi"],
  },
  {
    name: "Biologi (for helsefag)",
    fagkode: "BIO3101",
    required: ["Medisin", "Veterinærmedisin", "Ernæring (bachelor)"],
  },
];

function ProgramfagRisiko({ grades }: { grades: { fagkode: string | null; subject: string }[] }) {
  const fagkoder = new Set(grades.map((g) => g.fagkode).filter(Boolean));

  const missing = KEY_SUBJECTS.filter((s) => !fagkoder.has(s.fagkode));
  const present = KEY_SUBJECTS.filter((s) => fagkoder.has(s.fagkode));

  if (missing.length === 0) return null;

  return (
    <Card className="border-orange-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" aria-hidden="true" />
          <CardTitle className="text-base">Programfag-risikoanalyse</CardTitle>
        </div>
        <CardDescription>
          Basert på fagkodene dine mangler du nøkkelfag for visse studier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {present.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Du har:</p>
            {present.map((s) => (
              <div key={s.fagkode} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Du mangler (uten fagkode):</p>
          {missing.map((s) => (
            <div key={s.fagkode} className="space-y-0.5">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-medium">{s.name}</span>
                  <p className="text-xs text-muted-foreground">
                    Kreves for: {s.required.slice(0, 2).join(", ")}
                    {s.required.length > 2 ? ` og ${s.required.length - 2} til` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground border-t pt-2">
          Tips: Legg til fagkode (f.eks. MAT3206) når du registrerer karakterer for å aktivere denne analysen fullt ut.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Hjelpkomponenter
// ---------------------------------------------------------------------------

function PointCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", highlight ? "text-primary" : "text-muted-foreground")} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className={cn("text-2xl font-bold", highlight && "text-primary")}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Delta({
  current,
  simulated,
  decimals = 1,
}: {
  current: number;
  simulated: number;
  decimals?: number;
}) {
  const diff = simulated - current;
  if (Math.abs(diff) < 0.01) return null;
  const positive = diff > 0;
  return (
    <p className={cn("text-xs font-semibold", positive ? "text-green-600" : "text-red-500")}>
      {positive ? "+" : ""}{diff.toFixed(decimals)}
    </p>
  );
}

function StudyGroup({
  title,
  variant,
  programs,
  userPoints,
}: {
  title: string;
  variant: "success" | "warning" | "neutral";
  programs: StudyProgramEntry[];
  userPoints: number;
}) {
  const [expanded, setExpanded] = useState(variant !== "neutral");

  const colorMap = {
    success: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800",
    warning: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30 dark:border-yellow-800",
    neutral: "text-muted-foreground bg-muted border-border",
  };

  return (
    <div>
      <button
        className="flex w-full items-center justify-between py-2"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{programs.length}</Badge>
          <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="grid gap-2 sm:grid-cols-2">
          {programs.map((p, i) => {
            const missing = p.requiredPoints - userPoints;
            return (
              <div
                key={i}
                className={cn("rounded-lg border p-3 text-sm", colorMap[variant])}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs opacity-75">{p.institution}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs">Grense: {p.requiredPoints.toFixed(1)}p</span>
                  {variant === "warning" && (
                    <span className="text-xs font-medium">
                      Mangler {missing.toFixed(1)}p
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
