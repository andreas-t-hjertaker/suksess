"use client";

/**
 * Mentor-detaljside med booking og milestone-tracking (Issue #70)
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { riasecCompatibility } from "@/lib/mentoring/matching";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Linkedin,
  Send,
  Loader2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Mentor, MentoringRequest, UserProfile } from "@/types/domain";

// Fallback (samme som listesiden)
const MENTOR_FALLBACK: Record<string, Mentor> = {
  m1: {
    id: "m1", displayName: "Kari Andersen", photoURL: null, yrke: "Sivilingeniør (bygg)", bransje: "Bygg & anlegg",
    bio: "15 års erfaring som prosjektleder for store byggeprosjekter. Liker å hjelpe unge som vurderer ingeniøryrket.",
    riasec: { realistic: 85, investigative: 70, artistic: 30, social: 55, enterprising: 65, conventional: 60 },
    tilgjengelighet: ["Mandag 18–20", "Lørdag 10–12"], linkedinUrl: null, godkjent: true, createdAt: null, updatedAt: null,
  },
  m2: {
    id: "m2", displayName: "Jonas Berg", photoURL: null, yrke: "UX-designer", bransje: "IT & teknologi",
    bio: "Jobber i Bekk Consulting med brukeropplevelse og produktdesign. Bakgrunn fra kognitiv psykologi.",
    riasec: { realistic: 40, investigative: 75, artistic: 90, social: 70, enterprising: 55, conventional: 35 },
    tilgjengelighet: ["Tirsdag 17–19", "Fredag 12–14"], linkedinUrl: null, godkjent: true, createdAt: null, updatedAt: null,
  },
  m3: {
    id: "m3", displayName: "Marte Olsen", photoURL: null, yrke: "Lege (allmennpraksis)", bransje: "Helse",
    bio: "Fastlege i Oslo. Tok medisin etter usikkerhet om yrkesvalg på VGS — glad for å dele erfaringen.",
    riasec: { realistic: 55, investigative: 80, artistic: 40, social: 90, enterprising: 45, conventional: 50 },
    tilgjengelighet: ["Onsdag 19–21"], linkedinUrl: null, godkjent: true, createdAt: null, updatedAt: null,
  },
  m4: {
    id: "m4", displayName: "Erik Haugen", photoURL: null, yrke: "Tømrermester", bransje: "Håndverk & industri",
    bio: "Eier av eget tømrerfirma. Tok fagbrev etter VGS og er stolt av det. Lærlingeveien er undervurdert.",
    riasec: { realistic: 95, investigative: 45, artistic: 50, social: 60, enterprising: 75, conventional: 55 },
    tilgjengelighet: ["Torsdag 17–19", "Søndag 11–13"], linkedinUrl: null, godkjent: true, createdAt: null, updatedAt: null,
  },
  m5: {
    id: "m5", displayName: "Sofie Dahl", photoURL: null, yrke: "Journalist (NRK)", bransje: "Medie & kommunikasjon",
    bio: "Jobber med samfunnsjournalistikk. Tok medievitenskap og angrer ikke et sekund.",
    riasec: { realistic: 30, investigative: 75, artistic: 85, social: 70, enterprising: 65, conventional: 30 },
    tilgjengelighet: ["Mandag 17–19"], linkedinUrl: null, godkjent: true, createdAt: null, updatedAt: null,
  },
  m6: {
    id: "m6", displayName: "Lars Kristiansen", photoURL: null, yrke: "Regnskapssjef", bransje: "Økonomi & finans",
    bio: "CFO i mellomstor bedrift. Startet som regnskapsmedarbeider — karrierevekst gjennom faglig fordypning.",
    riasec: { realistic: 40, investigative: 65, artistic: 20, social: 50, enterprising: 70, conventional: 90 },
    tilgjengelighet: ["Tirsdag 18–20", "Fredag 17–19"], linkedinUrl: null, godkjent: true, createdAt: null, updatedAt: null,
  },
};

const MILESTONES = [
  { id: "intro" as const, label: "Introduksjonssamtale", desc: "Bli kjent, del bakgrunn og mål." },
  { id: "karrierekartlegging" as const, label: "Karrierekartlegging", desc: "Dykk dypere inn i yrket og karriereveien." },
  { id: "oppfolging" as const, label: "Oppfølging", desc: "Evaluering, neste steg og videre kontakt." },
];

function compatColor(score: number) {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 55) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

export default function MentorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [existingRequest, setExistingRequest] = useState<MentoringRequest | null>(null);
  const [melding, setMelding] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loadingMentor, setLoadingMentor] = useState(true);

  // Last profil
  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user]);

  // Last mentor
  useEffect(() => {
    async function load() {
      setLoadingMentor(true);
      const id = params.id;
      try {
        const snap = await getDoc(doc(db, "mentors", id));
        if (snap.exists()) {
          setMentor({ id: snap.id, ...snap.data() } as Mentor);
        } else {
          setMentor(MENTOR_FALLBACK[id] ?? null);
        }
      } catch {
        setMentor(MENTOR_FALLBACK[id] ?? null);
      } finally {
        setLoadingMentor(false);
      }
    }
    load();
  }, [params.id]);

  // Sjekk eksisterende forespørsel
  useEffect(() => {
    if (!user || !params.id) return;
    async function check() {
      const q = query(
        collection(db, "mentoringRequests"),
        where("elevId", "==", user!.uid),
        where("mentorId", "==", params.id)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setExistingRequest({ id: snap.docs[0].id, ...snap.docs[0].data() } as MentoringRequest);
      }
    }
    check().catch(() => {});
  }, [user, params.id]);

  async function sendBooking() {
    if (!user || !melding.trim() || !mentor) return;
    setSending(true);
    try {
      await addDoc(collection(db, "mentoringRequests"), {
        elevId: user.uid,
        mentorId: mentor.id,
        status: "pending",
        melding: melding.trim(),
        milestones: MILESTONES.map((m) => ({
          id: m.id,
          label: m.label,
          completed: false,
          completedAt: null,
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSent(true);
    } catch (err) {
      console.error("Booking feilet:", err);
    } finally {
      setSending(false);
    }
  }

  if (loadingMentor) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-3" aria-hidden="true" />
        Laster mentor…
      </div>
    );
  }

  if (!mentor) {
    return (
      <main className="p-6 max-w-2xl mx-auto space-y-4">
        <p className="text-muted-foreground">Mentor ikke funnet.</p>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Tilbake
        </Button>
      </main>
    );
  }

  const score = profile ? riasecCompatibility(profile.riasec, mentor.riasec) : null;
  const initials = mentor.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <main id="main-content" className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Tilbake-lenke */}
      <Link
        href="/dashboard/mentorer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Alle mentorer
      </Link>

      {/* Profil-header */}
      <Card className="p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">{mentor.displayName}</h1>
              {mentor.linkedinUrl && (
                <a
                  href={mentor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${mentor.displayName} på LinkedIn`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="text-muted-foreground">{mentor.yrke}</p>
            <Badge variant="secondary" className="mt-1">{mentor.bransje}</Badge>

            {score !== null && (
              <p className="mt-2 text-sm">
                RIASEC-kompatibilitet:{" "}
                <span className={cn("font-bold text-lg", compatColor(score))}>
                  {score}%
                </span>
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed">{mentor.bio}</p>

        {mentor.tilgjengelighet.length > 0 && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Tilgjengelig: {mentor.tilgjengelighet.join(" · ")}</span>
          </div>
        )}
      </Card>

      {/* Milepæler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mentoring-prosessen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MILESTONES.map((ms, idx) => {
            const completed =
              existingRequest?.milestones?.find((m) => m.id === ms.id)?.completed ?? false;
            return (
              <div key={ms.id} className="flex items-start gap-3">
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {idx + 1}. {ms.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{ms.desc}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Booking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" aria-hidden="true" />
            Book en samtale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingRequest ? (
            <div className="rounded-md bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              Du har allerede sendt en mentoring-forespørsel til {mentor.displayName}. Status:{" "}
              <span className="font-semibold capitalize">{existingRequest.status}</span>.
            </div>
          ) : sent ? (
            <div className="rounded-md bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              Forespørselen er sendt! {mentor.displayName} vil svare deg innen kort tid.
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Skriv en kort melding til {mentor.displayName}. Fortell hvem du er, hva du
                er usikker på, og hva du ønsker å få ut av samtalen.
              </p>
              <Textarea
                placeholder={`Hei ${mentor.displayName.split(" ")[0]}! Jeg er en VGS-elev som vurderer…`}
                value={melding}
                onChange={(e) => setMelding(e.target.value)}
                rows={4}
                aria-label="Melding til mentor"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{melding.length}/1000 tegn</span>
                <Button
                  onClick={sendBooking}
                  disabled={sending || melding.trim().length < 20}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                  )}
                  Send forespørsel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
