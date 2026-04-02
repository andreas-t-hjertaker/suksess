"use client";

/**
 * Jobbmatch-side — AI-drevet jobbmatching og søknadsbrev-generator (issue #15)
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getRiasecCode } from "@/lib/personality/scoring";
import { useChatSession } from "@/modules/ai-assistant/hooks/use-chat";
import { FeatureGate } from "@/components/feature-gate";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Star,
  StarOff,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Mock jobbdatabase (representativt utvalg)
// ---------------------------------------------------------------------------

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "heltid" | "deltid" | "internship" | "lærling";
  sector: string;
  riasecMatch: string[]; // RIASEC-typer som passer
  description: string;
  requirements: string[];
  salary?: string;
};

const JOBS: Job[] = [
  {
    id: "j1",
    title: "Juniorutvikler (backend)",
    company: "Bekk Consulting",
    location: "Oslo",
    type: "heltid",
    sector: "IT",
    riasecMatch: ["I", "R", "C"],
    description: "Vi søker en engasjert juniorutvikler til å jobbe med backend-systemer i Java/Kotlin.",
    requirements: ["Bachelor i informatikk", "Grunnleggende Java/Python", "Interesse for systemarkitektur"],
    salary: "540 000 – 620 000 kr/år",
  },
  {
    id: "j2",
    title: "UX-designer (junior)",
    company: "Eggs Design",
    location: "Oslo",
    type: "heltid",
    sector: "Design",
    riasecMatch: ["A", "I", "S"],
    description: "Bli med på å skape meningsfulle digitale produkter for norske sluttbrukere.",
    requirements: ["Utdanning innen interaksjonsdesign eller kommunikasjon", "Figma-erfaring", "Interesse for brukeratferd"],
    salary: "480 000 – 560 000 kr/år",
  },
  {
    id: "j3",
    title: "Regnskapsmedarbeider",
    company: "Visma",
    location: "Bergen",
    type: "heltid",
    sector: "Økonomi",
    riasecMatch: ["C", "E", "I"],
    description: "Støtt kundenes regnskapsrapportering og bidra i den digitale transformasjonen av regnskapsbransjen.",
    requirements: ["Bachelor i økonomi/regnskap", "Excel-kompetanse", "Nøyaktighet og struktur"],
    salary: "460 000 – 530 000 kr/år",
  },
  {
    id: "j4",
    title: "Miljøterapeut",
    company: "Oslo kommune",
    location: "Oslo",
    type: "heltid",
    sector: "Helse/sosial",
    riasecMatch: ["S", "A", "E"],
    description: "Arbeid med ungdom i utfordrende livssituasjoner innen barnevernstjenesten.",
    requirements: ["Vernepleier/barnevernspedagog", "Erfaring med ungdom", "Tålmodighet og empati"],
  },
  {
    id: "j5",
    title: "Bioingeniør",
    company: "Oslo universitetssykehus",
    location: "Oslo",
    type: "heltid",
    sector: "Helse",
    riasecMatch: ["I", "R", "C"],
    description: "Analyser biologiske prøver i en av Norges største laboratorieenheter.",
    requirements: ["Bioingeniørutdanning", "Erfaring med analysearbeid", "Nøyaktighet"],
    salary: "500 000 – 570 000 kr/år",
  },
  {
    id: "j6",
    title: "Markedskoordinator",
    company: "Kahoot!",
    location: "Oslo",
    type: "heltid",
    sector: "Marked/kommunikasjon",
    riasecMatch: ["E", "A", "S"],
    description: "Koordiner markedskampanjer og sosiale medier for et av Norges mest kjente tech-selskaper.",
    requirements: ["Bachelor i markedsføring/kommunikasjon", "Erfaring med SoMe", "Kreativitet"],
    salary: "490 000 – 560 000 kr/år",
  },
  {
    id: "j7",
    title: "Lærling elektro",
    company: "Caverion",
    location: "Trondheim",
    type: "lærling",
    sector: "Håndverk/teknikk",
    riasecMatch: ["R", "I", "C"],
    description: "Start din fagbrevreise innen elektriske installasjoner med en ledende teknisk servicevirksomhet.",
    requirements: ["VG2 elektrofag", "Motivasjon for praktisk arbeid"],
    salary: "250 000 – 310 000 kr/år",
  },
  {
    id: "j8",
    title: "Barnehagelærer",
    company: "Læringsverkstedet",
    location: "Stavanger",
    type: "heltid",
    sector: "Pedagogikk",
    riasecMatch: ["S", "A", "E"],
    description: "Gi barn de beste forutsetningene for læring og utvikling i en moderne barnehage.",
    requirements: ["Barnehagelærerutdanning", "Engasjement for barn", "Teamspiller"],
    salary: "470 000 – 530 000 kr/år",
  },
  {
    id: "j9",
    title: "Dataanalytiker (junior)",
    company: "DNB",
    location: "Oslo",
    type: "heltid",
    sector: "Finans/data",
    riasecMatch: ["I", "C", "R"],
    description: "Analyser store datamengder og bidra til datadrevne beslutninger i Norges største bank.",
    requirements: ["Bachelor i statistikk/informatikk/økonomi", "Python/SQL-erfaring", "Analytisk tankegang"],
    salary: "560 000 – 640 000 kr/år",
  },
  {
    id: "j10",
    title: "Sykepleier",
    company: "Helse Sør-Øst",
    location: "Akershus",
    type: "heltid",
    sector: "Helse",
    riasecMatch: ["S", "R", "I"],
    description: "Gi pasienter fremragende pleie og omsorg ved et av regionens ledende sykehus.",
    requirements: ["Sykepleierutdanning", "Autorisasjon", "Empati og faglig styrke"],
    salary: "510 000 – 590 000 kr/år",
  },
  {
    id: "j11",
    title: "Prosjektleder IT",
    company: "Accenture",
    location: "Oslo",
    type: "heltid",
    sector: "IT/konsulent",
    riasecMatch: ["E", "C", "I"],
    description: "Led digitale transformasjonsprosjekter for store norske virksomheter.",
    requirements: ["Bachelor/master i relevant felt", "Ledererfaring", "Sertifisering (PMP/Prince2) er en fordel"],
    salary: "680 000 – 820 000 kr/år",
  },
  {
    id: "j12",
    title: "Journalist (digital)",
    company: "NRK",
    location: "Oslo",
    type: "heltid",
    sector: "Medier",
    riasecMatch: ["A", "E", "S"],
    description: "Produser engasjerende innhold for NRKs digitale plattformer.",
    requirements: ["Journalistutdanning", "Sterk skriftlig fremstillingsevne", "Nysgjerrighet"],
    salary: "520 000 – 600 000 kr/år",
  },
];

// ---------------------------------------------------------------------------
// Match-score
// ---------------------------------------------------------------------------

function calcMatchScore(job: Job, riasecCode: string): number {
  const topLetters = riasecCode.slice(0, 3).split("");
  let score = 0;
  for (const letter of topLetters) {
    const matches = job.riasecMatch.filter((r) => r === letter).length;
    score += matches;
  }
  return Math.round((score / 3) * 100);
}

const TYPE_LABELS: Record<Job["type"], string> = {
  heltid: "Heltid",
  deltid: "Deltid",
  internship: "Internship",
  lærling: "Lærling",
};

// ---------------------------------------------------------------------------
// JobCard
// ---------------------------------------------------------------------------

function JobCard({
  job,
  matchScore,
  isFavorite,
  onToggleFavorite,
  onGenerateLetter,
}: {
  job: Job;
  matchScore: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onGenerateLetter: (job: Job) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const matchColor =
    matchScore >= 70
      ? "text-green-600"
      : matchScore >= 40
      ? "text-yellow-600"
      : "text-muted-foreground";

  return (
    <div className={cn("rounded-xl border bg-card transition-all", isFavorite && "border-primary/40 bg-primary/5")}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors"
          aria-label={isFavorite ? "Fjern favoritt" : "Legg til favoritt"}
        >
          {isFavorite ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{job.title}</p>
          <p className="text-xs text-muted-foreground">{job.company} · {job.location}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="secondary" className="text-xs">{TYPE_LABELS[job.type]}</Badge>
            <Badge variant="outline" className="text-xs">{job.sector}</Badge>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className={cn("text-lg font-bold", matchColor)}>{matchScore}%</p>
          <p className="text-[10px] text-muted-foreground">match</p>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground mt-3">{job.description}</p>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Krav</p>
            <ul className="space-y-1">
              {job.requirements.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {job.salary && (
            <p className="text-xs">
              <span className="font-medium">Lønn: </span>
              <span className="text-muted-foreground">{job.salary}</span>
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={(e) => { e.stopPropagation(); onGenerateLetter(job); }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generer søknadsbrev
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" render={<a href="https://arbeidsplassen.nav.no" target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="h-3.5 w-3.5" />
                Se på NAV
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function JobMatchPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const favoritesLoaded = useRef(false);

  useEffect(() => {
    if (!user) return;
    setProfileError(null);
    try {
      const unsub = subscribeToUserProfile(user.uid, (p) => {
        setProfile(p);
        setProfileLoading(false);
      });
      return unsub;
    } catch (err) {
      setProfileError(err instanceof Error ? err : new Error("Kunne ikke laste profil"));
      setProfileLoading(false);
    }
  }, [user]);

  // Last favoritter fra Firestore
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "jobbmatch", "favorites");
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        setFavorites(new Set((snap.data().ids as string[]) ?? []));
      }
      favoritesLoaded.current = true;
    }).catch(() => {
      favoritesLoaded.current = true;
    });
  }, [user]);

  // Lagre favoritter til Firestore
  useEffect(() => {
    if (!favoritesLoaded.current || !user) return;
    const ref = doc(db, "users", user.uid, "jobbmatch", "favorites");
    setDoc(ref, { ids: [...favorites], updatedAt: serverTimestamp() });
  }, [favorites, user]);

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : "IRS";

  const context = useMemo(
    () => ({
      user: user ? { displayName: user.displayName, email: user.email, uid: user.uid } : undefined,
      appName: "Suksess",
      currentPath: "/dashboard/jobbmatch",
    }),
    [user]
  );

  const systemPrompt = useMemo(() => {
    const name = user?.displayName ?? "eleven";
    const strengths = profile?.strengths?.join(", ") ?? "";
    return `Du er en norsk karriererådgiver som hjelper ${name} med å skrive søknadsbrev.
Profil: RIASEC-kode ${riasecCode}${strengths ? `, styrker: ${strengths}` : ""}.
Skriv alltid på norsk. Skriv profesjonelle, personlige søknadsbrev på 3–4 avsnitt.
Tilpass brevet til stilling og bedrift. Fremhev relevante styrker og motivasjon.`;
  }, [user, riasecCode, profile]);

  const { sendMessage, messages, isStreaming } = useChatSession(context, { systemPrompt });

  const scored = useMemo(
    () =>
      JOBS.map((j) => ({ job: j, score: calcMatchScore(j, riasecCode) })).sort(
        (a, b) => b.score - a.score
      ),
    [riasecCode]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return scored;
    const q = search.toLowerCase();
    return scored.filter(
      ({ job }) =>
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.sector.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q)
    );
  }, [scored, search]);

  async function handleGenerateLetter(job: Job) {
    setSelectedJob(job);
    setGenerating(true);
    const prompt = `Skriv et søknadsbrev for stilling som "${job.title}" hos ${job.company} i ${job.location}.
Krav: ${job.requirements.join("; ")}.
Beskrivelse: ${job.description}`;
    await sendMessage(prompt);
    setGenerating(false);
  }

  // Hent siste melding fra AI som søknadsbrevet
  const lastAiMessage = messages.filter((m) => m.role === "assistant").slice(-1)[0];

  if (profileLoading) {
    return <PageSkeleton variant="grid" cards={6} />;
  }

  if (profileError) {
    return <ErrorState message={profileError.message} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Jobbmatch</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Jobber sortert etter match med din RIASEC-profil ({riasecCode}). Generer søknadsbrev med AI.
        </p>
      </div>

      {/* Søk */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk stilling, bedrift, sted, sektor…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Jobb-liste */}
      <div className="space-y-2">
        {filtered.map(({ job, score }) => (
          <JobCard
            key={job.id}
            job={job}
            matchScore={score}
            isFavorite={favorites.has(job.id)}
            onToggleFavorite={() =>
              setFavorites((prev) => {
                const next = new Set(prev);
                if (next.has(job.id)) next.delete(job.id);
                else next.add(job.id);
                return next;
              })
            }
            onGenerateLetter={handleGenerateLetter}
          />
        ))}
      </div>

      {/* Søknadsbrev-panel */}
      {selectedJob && (
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              Søknadsbrev: {selectedJob.title} hos {selectedJob.company}
            </h2>
          </div>

          {generating || isStreaming ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Genererer søknadsbrev…
            </div>
          ) : lastAiMessage ? (
            <div className="space-y-3">
              <Textarea
                value={lastAiMessage.content}
                readOnly
                className="min-h-[300px] font-mono text-sm resize-y"
                aria-label="Generert søknadsbrev"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(lastAiMessage.content);
                }}
              >
                Kopier til utklippstavle
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function JobMatchPageGated() {
  return (
    <FeatureGate feature="jobbmatch">
      <JobMatchPage />
    </FeatureGate>
  );
}
