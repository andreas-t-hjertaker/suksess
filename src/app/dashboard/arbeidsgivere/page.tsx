"use client";

/**
 * Arbeidsgiverportal — lærlingplasser, sommerjobber og employer branding (Issue #71)
 *
 * Viser godkjente arbeidsgivere med stillingsannonser. Elever kan markere
 * interesse. Data fra Firestore med representative fallback-data.
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
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
  Building2,
  Heart,
  HeartOff,
  ExternalLink,
  MapPin,
  Briefcase,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employer, JobListing } from "@/types/domain";

// ---------------------------------------------------------------------------
// Fallback-data
// ---------------------------------------------------------------------------

const EMPLOYER_FALLBACK: Employer[] = [
  {
    id: "e1", navn: "Veidekke ASA", bransje: "Bygg & anlegg", fylke: "Oslo",
    logoUrl: null, godkjent: true,
    beskrivelse: "Norges største entreprenørselskap. Tilbyr lærlingplasser innen tømrer, betongfaget og anlegg.",
    nettside: "https://veidekke.no", kontaktEpost: "laerling@veidekke.no",
    createdAt: null, updatedAt: null,
  },
  {
    id: "e2", navn: "Helse Oslo HF", bransje: "Helse", fylke: "Oslo",
    logoUrl: null, godkjent: true,
    beskrivelse: "Regionalt helseforetak med over 10 000 ansatte. Tilbyr lærlingplass innen helsearbeiderfaget.",
    nettside: "https://oslo-universitetssykehus.no", kontaktEpost: null,
    createdAt: null, updatedAt: null,
  },
  {
    id: "e3", navn: "Eltel Networks", bransje: "IT & teknologi", fylke: "Viken",
    logoUrl: null, godkjent: true,
    beskrivelse: "Ledende innen kraftnett og fiberinfrastruktur. Søker lærlinger i elektriker og datateknikk.",
    nettside: "https://eltelnetworks.no", kontaktEpost: null,
    createdAt: null, updatedAt: null,
  },
  {
    id: "e4", navn: "Norgesgruppen", bransje: "Handel & service", fylke: "Landsdekke",
    logoUrl: null, godkjent: true,
    beskrivelse: "Norges største dagligvaregruppe. Sommerjobber og lærlingplasser i butikkfaget over hele landet.",
    nettside: "https://norgesgruppen.no", kontaktEpost: null,
    createdAt: null, updatedAt: null,
  },
  {
    id: "e5", navn: "Kongsberg Gruppen", bransje: "Industri & forsvar", fylke: "Viken",
    logoUrl: null, godkjent: true,
    beskrivelse: "Teknologikonsern med fokus på forsvar, maritim og subsea. Tilbyr lærling innen mekanikk og elektronikk.",
    nettside: "https://kongsberg.com", kontaktEpost: null,
    createdAt: null, updatedAt: null,
  },
];

const LISTING_FALLBACK: JobListing[] = [
  {
    id: "l1", employerId: "e1", tittel: "Tømmerlærling 2025", type: "lærling",
    beskrivelse: "Vi søker motiverte tømmerlærlinger til prosjekter i Oslo-området.",
    krav: ["VG2 Bygg- og anleggsteknikk", "Gyldig helseattest", "Eget verneutstyr"],
    riasecCodes: ["realistic", "enterprising"],
    aktiv: true, frist: null, createdAt: null, updatedAt: null,
  },
  {
    id: "l2", employerId: "e2", tittel: "Lærling helsearbeiderfaget", type: "lærling",
    beskrivelse: "Lærlingplass ved Oslo Universitetssykehus — avdeling geriatri.",
    krav: ["VG2 Helsearbeiderfag", "Politiattest", "Vaksiner iht. helsepersonelloven"],
    riasecCodes: ["social", "investigative"],
    aktiv: true, frist: null, createdAt: null, updatedAt: null,
  },
  {
    id: "l3", employerId: "e4", tittel: "Sommerjobb — butikkmedarbeider", type: "sommerjobb",
    beskrivelse: "Sommerjobber tilgjengelig ved KIWI og Meny over hele landet. Søk din lokale butikk.",
    krav: ["Minimum 15 år", "Serviceminded", "Fleksibel arbeidstid"],
    riasecCodes: ["social", "conventional", "enterprising"],
    aktiv: true, frist: null, createdAt: null, updatedAt: null,
  },
  {
    id: "l4", employerId: "e3", tittel: "Elektrikerlærling (fiber)", type: "lærling",
    beskrivelse: "Lærlingplass innen fiberinstallasjon og datateknikk. Gode vekstmuligheter.",
    krav: ["VG2 Elektro og datateknologi", "Sertifisert førstehjelp", "Bil/sertifikat er en fordel"],
    riasecCodes: ["realistic", "investigative"],
    aktiv: true, frist: null, createdAt: null, updatedAt: null,
  },
  {
    id: "l5", employerId: "e5", tittel: "Mekanikerlærling — Kongsberg", type: "lærling",
    beskrivelse: "Industrimekanikerlærling i verdensledende teknologimiljø. Høy lønn og faglig utvikling.",
    krav: ["VG2 Teknologi- og industrifag", "Norsk statsborgerskap (sikkerhetstillatelse)"],
    riasecCodes: ["realistic", "investigative", "conventional"],
    aktiv: true, frist: null, createdAt: null, updatedAt: null,
  },
];

const BRANSJER = [
  "Alle bransjer",
  "Bygg & anlegg",
  "Helse",
  "IT & teknologi",
  "Handel & service",
  "Industri & forsvar",
  "Medie & kommunikasjon",
  "Offentlig sektor",
];

const TYPER = ["Alle typer", "lærling", "sommerjobb", "deltid", "fast"] as const;

// ---------------------------------------------------------------------------
// Stillingsannonse-kort
// ---------------------------------------------------------------------------

function StillingKort({
  listing,
  employer,
  interested,
  onToggleInterest,
}: {
  listing: JobListing;
  employer: Employer | undefined;
  interested: boolean;
  onToggleInterest: (listingId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const typeLabels: Record<string, string> = {
    lærling: "Lærling",
    sommerjobb: "Sommerjobb",
    deltid: "Deltid",
    fast: "Fast stilling",
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">{listing.tittel}</h3>
          {employer && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
              {employer.navn}
              {employer.fylke && (
                <>
                  {" · "}
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {employer.fylke}
                </>
              )}
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 text-xs capitalize"
        >
          {typeLabels[listing.type] ?? listing.type}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{listing.beskrivelse}</p>

      {expanded && listing.krav.length > 0 && (
        <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
          {listing.krav.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs px-2 h-7 text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          )}
          {expanded ? "Skjul krav" : "Se krav"}
        </Button>

        <Button
          variant={interested ? "default" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => onToggleInterest(listing.id)}
          aria-pressed={interested}
        >
          {interested ? (
            <Heart className="h-3.5 w-3.5 mr-1 fill-current" aria-hidden="true" />
          ) : (
            <HeartOff className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          )}
          {interested ? "Interessert" : "Marker interesse"}
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Arbeidsgiver-seksjon
// ---------------------------------------------------------------------------

function ArbeidsgiverseksJon({
  employer,
  listings,
  interests,
  onToggleInterest,
}: {
  employer: Employer;
  listings: JobListing[];
  interests: Set<string>;
  onToggleInterest: (listingId: string) => void;
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-4 flex-wrap">
        {/* Logo-placeholder */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
          {employer.navn.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-base">{employer.navn}</h2>
            {employer.nettside && (
              <a
                href={employer.nettside}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${employer.navn} nettside (åpnes i ny fane)`}
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
            <Badge variant="secondary">{employer.bransje}</Badge>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {employer.fylke}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{employer.beskrivelse}</p>

      {listings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            Stillingsannonser ({listings.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <StillingKort
                key={l.id}
                listing={l}
                employer={employer}
                interested={interests.has(l.id)}
                onToggleInterest={onToggleInterest}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Hovedside
// ---------------------------------------------------------------------------

export default function ArbeidsgiverePage() {
  const { user } = useAuth();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bransje, setBransje] = useState("Alle bransjer");
  const [type, setType] = useState<string>("Alle typer");

  // Last data fra Firestore
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [eSnap, lSnap] = await Promise.all([
          getDocs(query(collection(db, "employers"), where("godkjent", "==", true))),
          getDocs(query(collection(db, "jobListings"), where("aktiv", "==", true))),
        ]);
        const eData = eSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Employer));
        const lData = lSnap.docs.map((d) => ({ id: d.id, ...d.data() } as JobListing));
        setEmployers(eData.length > 0 ? eData : EMPLOYER_FALLBACK);
        setListings(lData.length > 0 ? lData : LISTING_FALLBACK);
      } catch {
        setEmployers(EMPLOYER_FALLBACK);
        setListings(LISTING_FALLBACK);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Last elevens interesser
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "jobInterests", user.uid, "interests"))
      .then((snap) => {
        setInterests(new Set(snap.docs.map((d) => d.id)));
      })
      .catch(() => {});
  }, [user]);

  // Toggle interesse
  async function toggleInterest(listingId: string) {
    if (!user) return;
    const ref = doc(db, "jobInterests", user.uid, "interests", listingId);
    if (interests.has(listingId)) {
      setInterests((prev) => { const n = new Set(prev); n.delete(listingId); return n; });
      await deleteDoc(ref).catch(() => {});
    } else {
      setInterests((prev) => new Set(prev).add(listingId));
      await setDoc(ref, { listingId, savedAt: serverTimestamp() }).catch(() => {});
    }
  }

  // Filtrer arbeidsgivere
  const filtered = useMemo(() => {
    return employers.filter((e) => {
      if (bransje !== "Alle bransjer" && e.bransje !== bransje) return false;
      if (
        search &&
        !e.navn.toLowerCase().includes(search.toLowerCase()) &&
        !e.bransje.toLowerCase().includes(search.toLowerCase()) &&
        !e.fylke.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [employers, search, bransje]);

  // Filtrer stillinger
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (type !== "Alle typer" && l.type !== type) return false;
      return true;
    });
  }, [listings, type]);

  return (
    <main id="main-content" className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Topptekst */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
          Arbeidsgivere
        </h1>
        <p className="text-muted-foreground mt-1">
          Utforsk lærlingplasser, sommerjobber og arbeidsgivere som søker unge
          talenter. Marker interesse — anonymt og uten forpliktelser.
        </p>
      </div>

      {/* Filtrering */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Søk arbeidsgiver, bransje eller sted…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Søk arbeidsgivere"
          />
        </div>
        <Select value={bransje} onValueChange={setBransje}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filtrer på bransje">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANSJER.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filtrer på stillingstype">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPER.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t === "Alle typer" ? "Alle typer" : t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Innhold */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-3" aria-hidden="true" />
          Laster arbeidsgivere…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">
          Ingen arbeidsgivere funnet med gjeldende filter.
        </p>
      ) : (
        <div className="space-y-5" aria-label="Arbeidsgiverliste">
          {filtered.map((employer) => {
            const empListings = filteredListings.filter(
              (l) => l.employerId === employer.id
            );
            return (
              <ArbeidsgiverseksJon
                key={employer.id}
                employer={employer}
                listings={empListings}
                interests={interests}
                onToggleInterest={toggleInterest}
              />
            );
          })}
        </div>
      )}

      {/* GDPR-note */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Din interesse deles kun som anonymt antall med arbeidsgivere — aldri navn
        eller e-post. Se{" "}
        <a href="/dashboard/mine-data" className="underline">Mine data</a> for
        innsyn og sletting.
      </p>
    </main>
  );
}
