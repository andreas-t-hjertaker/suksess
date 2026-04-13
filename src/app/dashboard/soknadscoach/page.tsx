"use client";

/**
 * Søknads-coach — Poenggrense-tracker og søknads-coach (issue #19, #107)
 * - Live opptaksdata fra utdanning.no/DBH med fallback til mock-data
 * - Søk og sammenlign studieprogram vs. egne SO-poeng
 * - Historisk trenddata med sparkline-visualisering
 * - «Dine sjanser»-indikator
 * - Søknadsfrist-sjekkliste
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useXp } from "@/hooks/use-xp";
import { useGrades } from "@/hooks/use-grades";
import { calculateGradePoints } from "@/lib/grades/calculator";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Star,
  CheckCircle2,
  Circle,
  CalendarDays,
  Info,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { useOpptaksdata, type LiveStudyProgram } from "@/hooks/use-opptaksdata";
import type { UserProfile } from "@/types/domain";
import { ProgramCard } from "./program-card";

// ---------------------------------------------------------------------------
// Søknadsfrist-sjekkliste
// ---------------------------------------------------------------------------

type CheckItem = {
  id: string;
  label: string;
  deadline: string;
  done: boolean;
};

const DEFAULT_CHECKLIST: CheckItem[] = [
  { id: "so-profil", label: "Opprett profil på Samordna opptak", deadline: "Innen 1. februar", done: false },
  { id: "so-tidlig", label: "Søk tidlig opptak (bare ved snitt ≥ 5.0)", deadline: "1. mars", done: false },
  { id: "vitnemal", label: "Sjekk at vitnemål er korrekt", deadline: "Innen 1. april", done: false },
  { id: "so-ordinaer", label: "Send ordinær søknad via Samordna opptak", deadline: "15. april", done: false },
  { id: "dokumentasjon", label: "Last opp nødvendig dokumentasjon", deadline: "Innen 1. juli", done: false },
  { id: "svar", label: "Svar på tilbud innen fristen", deadline: "20. juli", done: false },
  { id: "poengberegn", label: "Beregn egne poeng inkl. realfagspoeng", deadline: "Løpende", done: false },
  { id: "backup", label: "Velg backup-studier (3–10 prioriteter)", deadline: "Innen 15. april", done: false },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SoknadsCoachPage() {
  const { user } = useAuth();
  const { grades, loading: gradesLoading } = useGrades();
  const { earnXp } = useXp();
  const gradePoints = useMemo(() => calculateGradePoints(grades), [grades]);
  const myPoints = gradePoints.totalPoints;

  // Hent RIASEC-profil
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user]);
  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;

  // Live opptaksdata
  const opptaksdata = useOpptaksdata(myPoints, riasecCode ?? "");

  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [checklist, setChecklist] = useState<CheckItem[]>(DEFAULT_CHECKLIST);
  const [tab, setTab] = useState<"programmer" | "sjekkliste">("programmer");
  const [loadError, setLoadError] = useState<string | null>(null);
  const dataLoaded = useRef(false);

  // Last favoritter og sjekkliste fra Firestore
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "soknadscoach", "data");
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFavorites(new Set((data.favorites as string[]) ?? []));
        if (data.checklist) {
          setChecklist(data.checklist as CheckItem[]);
        }
      }
      dataLoaded.current = true;
    }).catch((err) => {
      console.error("[SøknadsCoach] Feil ved lasting av data:", err);
      setLoadError("Kunne ikke laste søknadsdata. Prøv igjen senere.");
      dataLoaded.current = true;
    });
  }, [user]);

  // Lagre til Firestore ved endringer
  useEffect(() => {
    if (!dataLoaded.current || !user) return;
    const ref = doc(db, "users", user.uid, "soknadscoach", "data");
    setDoc(ref, { favorites: [...favorites], checklist, updatedAt: serverTimestamp() }, { merge: true });
  }, [favorites, checklist, user]);

  const programKey = (p: LiveStudyProgram) => `${p.navn}|${p.institusjon}`;

  const toggleFavorite = (key: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        earnXp("study_program_saved");
      }
      return next;
    });
  };

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const filtered = useMemo(() => {
    let list = opptaksdata.programs;
    if (showFavoritesOnly) list = list.filter((p) => favorites.has(programKey(p)));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.navn.toLowerCase().includes(q) ||
          p.institusjon.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const diffA = a.poengDiff ?? 0;
      const diffB = b.poengDiff ?? 0;
      // Vis programmer du er nærmest å kvalifisere for øverst
      return Math.abs(diffA) - Math.abs(diffB);
    });
  }, [search, showFavoritesOnly, favorites, opptaksdata.programs]);

  const doneCount = checklist.filter((c) => c.done).length;

  // Datakilde-info
  const liveCount = opptaksdata.programs.filter((p) => p.kilde === "live").length;
  const isLive = liveCount > 0;

  if (gradesLoading) {
    return <PageSkeleton variant="list" cards={5} />;
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Søknads-coach</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sammenlign studieprogram med dine poeng, se historiske trender og sjekk søknadsfristene.
        </p>
      </div>

      {/* Mine poeng-kort */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Dine SO-poeng</p>
            <p className="text-3xl font-bold text-primary">{myPoints > 0 ? myPoints.toFixed(1) : "–"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Karaktersnitt</p>
            <p className="text-2xl font-semibold">{gradePoints.average > 0 ? gradePoints.average.toFixed(2) : "–"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Realfagspoeng</p>
            <p className="text-2xl font-semibold">{gradePoints.sciencePoints}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Antall fag</p>
            <p className="text-2xl font-semibold">{gradePoints.subjectCount}</p>
          </div>
          {myPoints === 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Legg til karakterer for å se dine poeng
            </p>
          )}
        </CardContent>
      </Card>

      {/* Datakilde-info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isLive ? (
          <><Wifi className="h-3.5 w-3.5 text-green-500" /> Live data fra utdanning.no og DBH ({liveCount} programmer)</>
        ) : opptaksdata.loading ? (
          <><span className="h-3.5 w-3.5 rounded-full bg-yellow-400 animate-pulse inline-block" /> Henter opptaksdata…</>
        ) : (
          <><WifiOff className="h-3.5 w-3.5" /> Basert på historiske referansedata (47 programmer)</>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" role="tablist" aria-label="Søknadscoach-faner">
        {(["programmer", "sjekkliste"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "programmer" ? "Studieprogram" : "Sjekkliste"}
            {t === "sjekkliste" && (
              <Badge variant="outline" className="ml-2 text-xs">
                {doneCount}/{checklist.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {tab === "programmer" && (
        <div className="space-y-4">
          {/* Søk + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk studieprogram eller institusjon…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Søk studieprogram eller institusjon"
              />
            </div>
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly((v) => !v)}
              aria-pressed={showFavoritesOnly}
              className="gap-1.5 shrink-0"
            >
              <Star className="h-4 w-4" />
              Mine favoritter
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {filtered.length} programmer
            {riasecCode ? ` matchet med RIASEC-profil (${riasecCode})` : ""}
            {" "}— sortert etter nærhet til dine poeng. Klikk for å se trenddata og sjansekalkulator.
          </p>

          {opptaksdata.loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground text-sm">
                  {showFavoritesOnly ? "Du har ingen favoritter ennå." : "Ingen program matcher søket."}
                </p>
              ) : (
                filtered.map((p) => (
                  <ProgramCard
                    key={programKey(p)}
                    program={p}
                    myPoints={myPoints}
                    isFavorite={favorites.has(programKey(p))}
                    onToggleFavorite={() => toggleFavorite(programKey(p))}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {tab === "sjekkliste" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Hold styr på alle steg i søknadsprosessen
            </p>
            <Badge variant="secondary">{doneCount} av {checklist.length} fullført</Badge>
          </div>

          <Progress value={(doneCount / checklist.length) * 100} className="h-2" />

          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.done && "bg-muted/50 opacity-70"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", item.done && "line-through text-muted-foreground")}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarDays className="h-3 w-3" />
                    {item.deadline}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Viktige frister 2026</p>
            <p>• <strong>1. mars</strong>: Tidlig opptak (snitt ≥ 5.0 alle fag)</p>
            <p>• <strong>15. april</strong>: Ordinær søknadsfrist, Samordna opptak</p>
            <p>• <strong>1. juli</strong>: Frist for dokumentasjon</p>
            <p>• <strong>20. juli</strong>: Svar på tilbud om studieplass</p>
          </div>
        </div>
      )}
    </div>
  );
}
