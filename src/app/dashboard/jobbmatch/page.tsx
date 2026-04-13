"use client";

/**
 * Jobbmatch-side — AI-drevet jobbmatching med ekte NAV-stillinger (#15, #129)
 *
 * Henter ekte stillingsannonser fra Firestore (importert daglig fra NAV
 * pam-stilling-feed) og matcher mot elevens RIASEC-profil.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useJobSearch } from "@/hooks/use-job-search";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { getRiasecCode } from "@/lib/personality/scoring";
import { useChatSession } from "@/modules/ai-assistant/hooks/use-chat";
import { FeatureGate } from "@/components/feature-gate";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Search,
  Star,
  StarOff,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/domain";
import type { NavJobListing } from "@/lib/jobbmatch/nav-stillinger";

// ---------------------------------------------------------------------------
// Konstanter
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  heltid: "Heltid",
  deltid: "Deltid",
  internship: "Internship",
  "lærling": "Lærling",
  annet: "Annet",
};

const TYPE_OPTIONS = [
  { value: "", label: "Alle typer" },
  { value: "heltid", label: "Heltid" },
  { value: "deltid", label: "Deltid" },
  { value: "lærling", label: "Lærling" },
  { value: "internship", label: "Internship" },
];

const RIASEC_LETTERS: Record<string, string> = {
  realistic: "R",
  investigative: "I",
  artistic: "A",
  social: "S",
  enterprising: "E",
  conventional: "C",
};

// ---------------------------------------------------------------------------
// JobCard
// ---------------------------------------------------------------------------

function JobCard({
  job,
  isFavorite,
  onToggleFavorite,
  onGenerateLetter,
}: {
  job: NavJobListing;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onGenerateLetter: (job: NavJobListing) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const matchColor =
    job.matchScore >= 70
      ? "text-green-600"
      : job.matchScore >= 40
      ? "text-yellow-600"
      : "text-muted-foreground";

  const riasecLetters = job.riasecCodes
    .map((code) => RIASEC_LETTERS[code] || code)
    .join("");

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
            <Badge variant="secondary" className="text-xs">{TYPE_LABELS[job.type] ?? job.type}</Badge>
            {job.sector && <Badge variant="outline" className="text-xs">{job.sector}</Badge>}
            {riasecLetters && <Badge variant="outline" className="text-xs">RIASEC: {riasecLetters}</Badge>}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className={cn("text-lg font-bold", matchColor)}>{job.matchScore}%</p>
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
          {job.description && (
            <p className="text-sm text-muted-foreground mt-3">{job.description}</p>
          )}

          {job.deadline && (
            <p className="text-xs flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">Søknadsfrist: </span>
              <span className="text-muted-foreground">{job.deadline}</span>
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
            {job.applicationUrl ? (
              <Button size="sm" variant="outline" className="gap-1.5" render={<a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="h-3.5 w-3.5" />
                Se på NAV
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5" render={<a href="https://arbeidsplassen.nav.no" target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="h-3.5 w-3.5" />
                NAV Arbeidsplassen
              </Button>
            )}
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
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<NavJobListing | null>(null);
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
      return undefined;
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

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;

  // Jobbsøk med ekte NAV-data
  const {
    jobs,
    loading: jobsLoading,
    loadingMore,
    error: jobsError,
    hasMore,
    locations,
    loadMore,
    retry,
  } = useJobSearch({
    riasecProfile: profile?.riasec ?? null,
    query: search || undefined,
    location: locationFilter || undefined,
    type: typeFilter || undefined,
  });

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
Profil: ${riasecCode ? `RIASEC-kode ${riasecCode}` : "Ingen RIASEC-profil ennå"}${strengths ? `, styrker: ${strengths}` : ""}.
Skriv alltid på norsk. Skriv profesjonelle, personlige søknadsbrev på 3–4 avsnitt.
Tilpass brevet til stilling og bedrift. Fremhev relevante styrker og motivasjon.`;
  }, [user, riasecCode, profile]);

  const { sendMessage, messages, isStreaming } = useChatSession(context, { systemPrompt });

  async function handleGenerateLetter(job: NavJobListing) {
    setSelectedJob(job);
    const prompt = `Skriv et søknadsbrev for stilling som "${job.title}" hos ${job.company} i ${job.location}.
Beskrivelse: ${job.description}`;
    await sendMessage(prompt);
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
          Ekte stillinger fra NAV{riasecCode ? ` matchet mot din RIASEC-profil (${riasecCode})` : ""}.
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
          aria-label="Søk etter stilling, bedrift eller sted"
        />
      </div>

      {/* Filtre */}
      <div className="flex gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrer på stillingstype">
            <SelectValue placeholder="Alle typer" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrer på sted">
            <SelectValue placeholder="Alle steder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle steder</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobb-liste */}
      {jobsLoading ? (
        <PageSkeleton variant="list" />
      ) : jobsError ? (
        <ErrorState message={jobsError} onRetry={retry} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Ingen stillinger funnet"
          description="Prøv å endre søk eller filtre, eller kom tilbake senere for nye stillinger fra NAV."
        />
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
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

          {/* Last inn flere */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Laster…</>
                ) : (
                  "Last inn flere stillinger"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Søknadsbrev-panel */}
      {selectedJob && (
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              Søknadsbrev: {selectedJob.title} hos {selectedJob.company}
            </h2>
          </div>

          {isStreaming ? (
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
