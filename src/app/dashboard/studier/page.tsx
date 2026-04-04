"use client";

/**
 * Studiemestringsmodul — faglig progresjon for høyere utdanning (issue #26)
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  Plus,
  Trash2,
  Brain,
  Target,
  Calendar,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudiedata } from "@/hooks/use-studiedata";
import { useOpptaksdata } from "@/hooks/use-opptaksdata";
import { useGrades } from "@/hooks/use-grades";
import { calculateGradePoints } from "@/lib/grades/calculator";
import { TrendSparkline } from "@/components/trend-sparkline";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type Course = {
  id: string;
  name: string;
  credits: number; // ECTS
  grade?: number;  // A=5, B=4, C=3, D=2, E=1, F=0
  passed: boolean;
  semester: string; // "H24", "V25" etc.
};

type GradeLetter = "A" | "B" | "C" | "D" | "E" | "F" | "–";

const GRADE_MAP: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
const GRADE_LABELS: Record<number, GradeLetter> = { 5: "A", 4: "B", 3: "C", 2: "D", 1: "E", 0: "F" };

// ---------------------------------------------------------------------------
// AI-studietips basert på profil
// ---------------------------------------------------------------------------

const TIPS_BY_RIASEC: Record<string, string[]> = {
  I: [
    "Bruk Feynman-teknikken: Forklar konsepter med egne ord som om du lærer dem bort.",
    "Les primærkilder og originale forskningsartikler i stedet for sammendrag.",
    "Lag egne notater med spørsmål du vil utforske videre.",
  ],
  R: [
    "Knytt teori til praktiske eksempler og hands-on øvelser.",
    "Bruk laboratoriearbeid og prosjekter aktivt for å forankre kunnskap.",
    "Lag fysiske modeller eller skjematiske tegninger av vanskelig stoff.",
  ],
  A: [
    "Bruk mindmaps og visuelle strukturer for å organisere læremateriell.",
    "Skriv refleksjonsnotat etter forelesninger — kreativ gjenfortelling styrker hukommelsen.",
    "Søk etter multimediale læringsressurser (videoer, podcaster, illustrasjoner).",
  ],
  S: [
    "Delta i kollokviegrupper og diskusjonsgrupper — du lærer best i samarbeid.",
    "Lær bort stoff til medstudenter — undervisning er den beste læringsmetoden.",
    "Bruk studiestøttestjenester og veiledertimer aktivt.",
  ],
  E: [
    "Sett deg tydelige delmål og tidsfrister — du fungerer best med klare mål.",
    "Bruk pomodoro-teknikken (25 min arbeid / 5 min pause) for å opprettholde fokus.",
    "Delta i case-konkurranser og prosjektgrupper for å anvende kunnskap.",
  ],
  C: [
    "Lag detaljerte leseplanleggere og følg dem systematisk.",
    "Bruk flash cards og repetisjon med jevne mellomrom (spaced repetition).",
    "Organiser notater i klare mappestrukturer og bruk konsistente farger/koder.",
  ],
};

function getTipsForProfile(riasecCode: string): string[] {
  const letters = riasecCode.slice(0, 2).split("");
  const tips: string[] = [];
  for (const letter of letters) {
    const t = TIPS_BY_RIASEC[letter];
    if (t) tips.push(...t.slice(0, 2));
  }
  return tips.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Eksamensforberedelse-sjekkliste
// ---------------------------------------------------------------------------

const EXAM_CHECKLIST = [
  { id: "plan", label: "Lag en detaljert leseplan (fordel stoff over uker)" },
  { id: "pensum", label: "Les gjennom og marker alt pensum" },
  { id: "notat", label: "Lag sammendragsnotater for hvert tema" },
  { id: "oppgaver", label: "Løs gamle eksamensoppgaver" },
  { id: "kollokvie", label: "Gjennomgå stoff med kollokviegruppe" },
  { id: "sovn", label: "Prioriter søvn — 7-8t natten før eksamen" },
  { id: "mat", label: "Spis godt og ta pauser regelmessig" },
  { id: "lokale", label: "Sjekk eksamenslokale og tidspunkt dagen før" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudierPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState("10");
  const [newGrade, setNewGrade] = useState<string>("–");
  const [newSemester, setNewSemester] = useState("H25");
  const [examChecks, setExamChecks] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"progresjon" | "studietips" | "eksamen" | "anbefalinger">("progresjon");
  useStudiedata();
  const initialLoad = useRef(true);

  // Last kurser fra Firestore
  useEffect(() => {
    if (!user) {
      setLoadingCourses(false);
      return;
    }
    const ref = doc(db, "users", user.uid, "studier", "emner");
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCourses((data.courses as Course[]) ?? []);
        setExamChecks(new Set((data.examChecks as string[]) ?? []));
      }
      setLoadingCourses(false);
      initialLoad.current = false;
    }).catch(() => {
      setLoadingCourses(false);
      initialLoad.current = false;
    });
  }, [user]);

  // Lagre kurser til Firestore når de endres (skip under initial load)
  useEffect(() => {
    if (initialLoad.current || !user) return;
    const ref = doc(db, "users", user.uid, "studier", "emner");
    setDoc(ref, { courses, examChecks: [...examChecks], updatedAt: serverTimestamp() }, { merge: true });
  }, [courses, examChecks, user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user]);

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : "IRS";
  const { grades: userGrades } = useGrades();
  const gradePoints = useMemo(() => calculateGradePoints(userGrades), [userGrades]);
  const opptaksdata = useOpptaksdata(gradePoints.totalPoints, riasecCode);
  const studyTips = useMemo(() => getTipsForProfile(riasecCode), [riasecCode]);

  const totalCredits = courses.filter((c) => c.passed).reduce((s, c) => s + c.credits, 0);
  const targetCredits = 180; // Typisk bachelor
  const passedCourses = courses.filter((c) => c.passed);

  const gradeAvg = useMemo(() => {
    const graded = passedCourses.filter((c) => c.grade !== undefined);
    if (graded.length === 0) return null;
    return graded.reduce((s, c) => s + (c.grade! * c.credits), 0) /
      graded.reduce((s, c) => s + c.credits, 0);
  }, [passedCourses]);

  function addCourse() {
    if (!newName.trim()) return;
    const grade = GRADE_MAP[newGrade] ?? undefined;
    setCourses((prev) => [
      ...prev,
      {
        id: `c${Date.now()}`,
        name: newName.trim(),
        credits: parseInt(newCredits) || 10,
        grade,
        passed: grade !== undefined && grade > 0,
        semester: newSemester,
      },
    ]);
    setNewName("");
    setNewGrade("–");
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  const gradeLabel = (grade?: number): GradeLetter => {
    if (grade === undefined) return "–";
    return GRADE_LABELS[grade] ?? "–";
  };

  const gradeColor = (grade?: number) => {
    if (!grade) return "text-muted-foreground";
    if (grade >= 4) return "text-green-600 dark:text-green-400";
    if (grade === 3) return "text-blue-600 dark:text-blue-400";
    return "text-orange-600 dark:text-orange-400";
  };

  if (loadingCourses) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Studiemestring</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Følg din faglige progresjon i høyere utdanning, få personaliserte studietips og forbered deg til eksamen.
        </p>
      </div>

      {/* Stats-kort */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Studiepoeng", value: `${totalCredits}`, sub: `av ${targetCredits} (bachelor)`, icon: BookOpen, color: "text-blue-500" },
          { label: "Bestått emner", value: `${passedCourses.length}`, sub: `av ${courses.length} totalt`, icon: CheckCircle2, color: "text-green-500" },
          { label: "Karaktersnitt", value: gradeAvg ? gradeAvg.toFixed(2) : "–", sub: "vektet snitt", icon: TrendingUp, color: "text-violet-500" },
          { label: "Progresjon", value: `${Math.min(100, Math.round((totalCredits / targetCredits) * 100))}%`, sub: "av bachelor", icon: Target, color: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label} className="text-center">
            <CardContent className="py-3 px-2 space-y-1">
              <s.icon className={cn("h-5 w-5 mx-auto", s.color)} aria-hidden="true" />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Studiepoeng mot bachelor</span>
          <span>{totalCredits} / {targetCredits} ECTS</span>
        </div>
        <Progress value={Math.min(100, (totalCredits / targetCredits) * 100)} className="h-2" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["progresjon", "anbefalinger", "studietips", "eksamen"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "progresjon" ? "Emner" : t === "anbefalinger" ? "Anbefalinger" : t === "studietips" ? "Studietips" : "Eksamensforberedelse"}
          </button>
        ))}
      </div>

      {tab === "progresjon" && (
        <div className="space-y-4">
          {/* Legg til emne */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <p className="text-sm font-medium">Legg til emne</p>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Emnenavn"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 min-w-32"
                onKeyDown={(e) => e.key === "Enter" && addCourse()}
              />
              <Input
                type="number"
                placeholder="ECTS"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                className="w-20"
                min={1}
                max={30}
              />
              <select
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                className="rounded-md border bg-background px-3 text-sm"
                aria-label="Karakter"
              >
                {["A", "B", "C", "D", "E", "F", "–"].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <Input
                placeholder="Semester"
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value)}
                className="w-20"
              />
              <Button onClick={addCourse} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Legg til
              </Button>
            </div>
          </div>

          {/* Emne-liste */}
          <div className="space-y-2">
            {courses.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Ingen emner ennå. Legg til et emne ovenfor.</p>
            ) : (
              courses.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border px-4 py-2.5">
                  {c.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" aria-label="Bestått" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Ikke bestått/pågår" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.semester} · {c.credits} ECTS</p>
                  </div>
                  <span className={cn("text-lg font-bold", gradeColor(c.grade))}>
                    {gradeLabel(c.grade)}
                  </span>
                  <button
                    onClick={() => removeCourse(c.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Slett emne"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "anbefalinger" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-primary/5 border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium">Anbefalte studieprogram basert på RIASEC ({riasecCode})</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {gradePoints.totalPoints > 0
                ? `Dine SO-poeng: ${gradePoints.totalPoints.toFixed(1)} — `
                : ""}
              {opptaksdata.programs.some((p) => p.kilde === "live")
                ? "Live data fra utdanning.no og DBH, oppdatert daglig."
                : "Data fra utdanning.no."}
            </p>
          </div>

          {opptaksdata.loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : opptaksdata.error && opptaksdata.programs.length === 0 ? (
            <p className="text-sm text-destructive text-center py-8">{opptaksdata.error}</p>
          ) : opptaksdata.programs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {profile?.riasec ? "Ingen studieprogram funnet for din profil ennå." : "Fullfør personlighetstesten for å se anbefalinger."}
            </p>
          ) : (
            <div className="space-y-2">
              {opptaksdata.programs.slice(0, 15).map((p) => (
                <div key={p.kode} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                  <BookOpen className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.navn}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">{p.institusjon}</p>
                      {p.poenggrense !== null && (
                        <span className="text-xs font-medium">{p.poenggrense} poeng</span>
                      )}
                    </div>
                  </div>
                  {p.trend.length >= 2 && (
                    <TrendSparkline data={p.trend} width={80} height={24} />
                  )}
                  {p.sjanse !== "ukjent" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        p.sjanse === "god" && "text-green-600",
                        p.sjanse === "usikker" && "text-yellow-600",
                        p.sjanse === "lav" && "text-red-600"
                      )}
                    >
                      {p.sjanse === "god" ? "God sjanse" : p.sjanse === "usikker" ? "Usikker" : "Lav sjanse"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "studietips" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-primary/5 border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium">Tips basert på din RIASEC-profil ({riasecCode})</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Disse studietipsene er tilpasset din personlighetstype. {profile ? "" : "Fullfør profilen for enda mer personlige tips."}
            </p>
          </div>

          <div className="space-y-3">
            {studyTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border px-4 py-3">
                <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm">{tip}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Generelle studieteknikker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "Aktiv læring slår passiv lesing: lag egne eksempler og tester.",
                "Fordel læringsøktene over tid (spaced repetition) fremfor å pugge natten før.",
                "Søvn er kritisk for hukommelse — aldri offer søvn for å studere mer.",
                "Pomodoro-teknikk: 25 min fokus, 5 min pause, 4 runder → 30 min pause.",
                "Unngå multitasking — én oppgave om gangen gir langt bedre resultat.",
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <span className="text-muted-foreground">{t}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "eksamen" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Huk av punktene etter hvert som du forbereder deg til eksamen.
          </p>

          <div className="space-y-2">
            {EXAM_CHECKLIST.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  setExamChecks((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  examChecks.has(item.id) && "bg-muted/50 opacity-70"
                )}
              >
                {examChecks.has(item.id) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                )}
                <span className={cn("text-sm", examChecks.has(item.id) && "line-through text-muted-foreground")}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{examChecks.size} av {EXAM_CHECKLIST.length} fullført</span>
            <Progress value={(examChecks.size / EXAM_CHECKLIST.length) * 100} className="h-1.5 w-32" />
          </div>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs space-y-1">
                  <p className="font-medium">Husk eksamensregler</p>
                  <p className="text-muted-foreground">Møt opp 30 min før start · Ta med gyldig legitimasjon · Sjekk tillatte hjelpemidler i forkant</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
