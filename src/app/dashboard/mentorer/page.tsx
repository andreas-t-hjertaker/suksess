"use client";

/**
 * Karrierementoring — RIASEC-basert matching elev ↔ mentor (Issue #70)
 *
 * Viser godkjente mentorer med kompatibilitetsscore basert på elevens
 * RIASEC-profil. Mentor-data hentes fra Firestore `mentors/` med fallback
 * til representative eksempler for tom database.
 */

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { riasecCompatibility } from "@/lib/mentoring/matching";
import { FeatureGate } from "@/components/feature-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Star,
  Linkedin,
  ExternalLink,
  Loader2,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Mentor, UserProfile, RiasecScores } from "@/types/domain";

// ---------------------------------------------------------------------------
// Fallback-mentorer for tom database
// ---------------------------------------------------------------------------

const RIASEC_NULL: RiasecScores = {
  realistic: 50,
  investigative: 50,
  artistic: 50,
  social: 50,
  enterprising: 50,
  conventional: 50,
};

const MENTOR_FALLBACK: Mentor[] = [
  {
    id: "m1",
    displayName: "Kari Andersen",
    photoURL: null,
    yrke: "Sivilingeniør (bygg)",
    bransje: "Bygg & anlegg",
    bio: "15 års erfaring som prosjektleder for store byggeprosjekter. Liker å hjelpe unge som vurderer ingeniøryrket.",
    riasec: { realistic: 85, investigative: 70, artistic: 30, social: 55, enterprising: 65, conventional: 60 },
    tilgjengelighet: ["Mandag 18–20", "Lørdag 10–12"],
    linkedinUrl: null,
    godkjent: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "m2",
    displayName: "Jonas Berg",
    photoURL: null,
    yrke: "UX-designer",
    bransje: "IT & teknologi",
    bio: "Jobber i Bekk Consulting med brukeropplevelse og produktdesign. Bakgrunn fra kognitiv psykologi.",
    riasec: { realistic: 40, investigative: 75, artistic: 90, social: 70, enterprising: 55, conventional: 35 },
    tilgjengelighet: ["Tirsdag 17–19", "Fredag 12–14"],
    linkedinUrl: null,
    godkjent: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "m3",
    displayName: "Marte Olsen",
    photoURL: null,
    yrke: "Lege (allmennpraksis)",
    bransje: "Helse",
    bio: "Fastlege i Oslo. Tok medisin etter usikkerhet om yrkesvalg på VGS — glad for å dele erfaringen.",
    riasec: { realistic: 55, investigative: 80, artistic: 40, social: 90, enterprising: 45, conventional: 50 },
    tilgjengelighet: ["Onsdag 19–21"],
    linkedinUrl: null,
    godkjent: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "m4",
    displayName: "Erik Haugen",
    photoURL: null,
    yrke: "Tømrermester",
    bransje: "Håndverk & industri",
    bio: "Eier av eget tømrerfirma. Tok fagbrev etter VGS og er stolt av det. Lærlingeveien er undervurdert.",
    riasec: { realistic: 95, investigative: 45, artistic: 50, social: 60, enterprising: 75, conventional: 55 },
    tilgjengelighet: ["Torsdag 17–19", "Søndag 11–13"],
    linkedinUrl: null,
    godkjent: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "m5",
    displayName: "Sofie Dahl",
    photoURL: null,
    yrke: "Journalist (NRK)",
    bransje: "Medie & kommunikasjon",
    bio: "Jobber med samfunnsjournalistikk. Tok medievitenskap og angrer ikke et sekund. Brenner for mediefrihet.",
    riasec: { realistic: 30, investigative: 75, artistic: 85, social: 70, enterprising: 65, conventional: 30 },
    tilgjengelighet: ["Mandag 17–19"],
    linkedinUrl: null,
    godkjent: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "m6",
    displayName: "Lars Kristiansen",
    photoURL: null,
    yrke: "Regnskapssjef",
    bransje: "Økonomi & finans",
    bio: "CFO i mellomstor bedrift. Startet som regnskapsmedarbeider — karrierevekst gjennom faglig fordypning.",
    riasec: { realistic: 40, investigative: 65, artistic: 20, social: 50, enterprising: 70, conventional: 90 },
    tilgjengelighet: ["Tirsdag 18–20", "Fredag 17–19"],
    linkedinUrl: null,
    godkjent: true,
    createdAt: null,
    updatedAt: null,
  },
];

const BRANSJER = [
  "Alle bransjer",
  "IT & teknologi",
  "Helse",
  "Bygg & anlegg",
  "Håndverk & industri",
  "Medie & kommunikasjon",
  "Økonomi & finans",
  "Utdanning",
  "Offentlig sektor",
];

// ---------------------------------------------------------------------------
// Kompatibilitetsfarge
// ---------------------------------------------------------------------------

function compatColor(score: number) {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 55) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

// ---------------------------------------------------------------------------
// MentorKort
// ---------------------------------------------------------------------------

function MentorKort({
  mentor,
  score,
}: {
  mentor: Mentor;
  score: number | null;
}) {
  const initials = mentor.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="flex flex-col gap-4 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">{mentor.displayName}</h3>
            {mentor.linkedinUrl && (
              <a
                href={mentor.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${mentor.displayName} på LinkedIn`}
                className="text-muted-foreground hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{mentor.yrke}</p>
          <Badge variant="secondary" className="mt-1 text-xs">
            {mentor.bransje}
          </Badge>
        </div>

        {score !== null && (
          <div className="text-right shrink-0">
            <span className={cn("text-2xl font-bold", compatColor(score))}>
              {score}
            </span>
            <p className="text-[10px] text-muted-foreground">% match</p>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-3">{mentor.bio}</p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{mentor.tilgjengelighet.join(" · ")}</span>
      </div>

      <Link href={`/dashboard/mentorer/${mentor.id}`} className="mt-auto">
        <Button className="w-full" size="sm">
          Se profil og book samtale
        </Button>
      </Link>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Hovedside
// ---------------------------------------------------------------------------

export default function MentorListePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mentorer, setMentorer] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bransje, setBransje] = useState("Alle bransjer");

  // Last profil
  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user]);

  // Last mentorer fra Firestore, fall tilbake på statisk data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "mentors"),
          where("godkjent", "==", true)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Mentor));
        setMentorer(data.length > 0 ? data : MENTOR_FALLBACK);
      } catch {
        setMentorer(MENTOR_FALLBACK);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Beregn matcher og filtrer
  const filtered = useMemo(() => {
    const elevRiasec = profile?.riasec ?? null;

    return mentorer
      .map((m) => ({
        mentor: m,
        score: elevRiasec ? riasecCompatibility(elevRiasec, m.riasec) : null,
      }))
      .filter(({ mentor }) => {
        if (bransje !== "Alle bransjer" && mentor.bransje !== bransje) return false;
        if (
          search &&
          !mentor.displayName.toLowerCase().includes(search.toLowerCase()) &&
          !mentor.yrke.toLowerCase().includes(search.toLowerCase()) &&
          !mentor.bransje.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.score ?? 50) - (a.score ?? 50));
  }, [mentorer, profile, search, bransje]);

  return (
    <FeatureGate feature="mentor-kobling">
      <main id="main-content" className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Topptekst */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            Karrierementorer
          </h1>
          <p className="text-muted-foreground mt-1">
            Koble deg med yrkesaktive voksne som deler din RIASEC-profil. En
            30-minutters samtale kan gi mer klarhet enn hundre nettsider.
          </p>
          {!profile && (
            <p className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 rounded-md px-3 py-2 mt-3">
              Fullfør personlighetstesten for å se RIASEC-kompatibilitet med
              mentorene.{" "}
              <Link
                href="/dashboard/profil"
                className="underline font-medium"
              >
                Gå til profil
              </Link>
            </p>
          )}
        </div>

        {/* Søk og filtrering */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              className="pl-9"
              placeholder="Søk etter mentor, yrke eller bransje…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Søk etter mentor"
            />
          </div>
          <Select value={bransje} onValueChange={setBransje}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Filtrer på bransje">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BRANSJER.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mentorkort */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-3" aria-hidden="true" />
            Laster mentorer…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">
            Ingen mentorer funnet med gjeldende filter.
          </p>
        ) : (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Mentorer"
          >
            {filtered.map(({ mentor, score }) => (
              <MentorKort key={mentor.id} mentor={mentor} score={score} />
            ))}
          </div>
        )}
      </main>
    </FeatureGate>
  );
}
