"use client";

/**
 * Lærlingutforsker — Fagbrev, lærebedrifter og yrkesfag (Issue #62)
 *
 * Lar elever utforske:
 * - Tilgjengelige fagbrev og svennebrev
 * - Lærebedrifter per fylke og fag
 * - Lønnsnivå for fagarbeidere
 * - Kobling til VGS-fagkoder (Grep/Kunnskapsløftet)
 */

import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Briefcase, Award, ExternalLink, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  fetchTradeCertificates,
  fetchLaerebedrifter,
  formaterLonnFagarbeider,
  NORSKE_FYLKER,
  type TradeCertificate,
  type Laerebedrift,
} from "@/lib/studiedata/laerling-client";

// ---------------------------------------------------------------------------
// Fallback-data for tom database
// ---------------------------------------------------------------------------

const FAGBREV_FALLBACK: TradeCertificate[] = [
  { id: "f1", tittel: "Tømrerfaget", beskrivelse: "Bygg og anlegg — bygge og renovere boliger og næringsbygg.", nusCode: "5240106", lonn: 620000, url: "https://utdanning.no/tema/hjelp_til_utdanningsvalget/yrkesfag" },
  { id: "f2", tittel: "Elektriker", beskrivelse: "Installasjon og vedlikehold av elektriske anlegg.", nusCode: "5521101", lonn: 640000, url: "https://utdanning.no" },
  { id: "f3", tittel: "Datafaget", beskrivelse: "IT-supporter og nettverksadministrasjon.", nusCode: "5481102", lonn: 580000, url: "https://utdanning.no" },
  { id: "f4", tittel: "Helsearbeiderfaget", beskrivelse: "Pleie og omsorg for pasienter i sykehjem og hjemmesykepleie.", nusCode: "5723105", lonn: 520000, url: "https://utdanning.no" },
  { id: "f5", tittel: "Kokkfaget", beskrivelse: "Matlaging og kjøkkendrift på restaurant og storkjøkken.", nusCode: "5811101", lonn: 480000, url: "https://utdanning.no" },
  { id: "f6", tittel: "Industrimekanikerfaget", beskrivelse: "Vedlikehold og reparasjon av industrielt maskineri.", nusCode: "5212118", lonn: 650000, url: "https://utdanning.no" },
  { id: "f7", tittel: "Bilfaget, lette kjøretøy", beskrivelse: "Service og reparasjon av personbiler og lette varebiler.", nusCode: "5521204", lonn: 560000, url: "https://utdanning.no" },
  { id: "f8", tittel: "Rørleggerfaget", beskrivelse: "Installasjon av VVS-anlegg i boliger og næringsbygg.", nusCode: "5521111", lonn: 620000, url: "https://utdanning.no" },
];

const BEDRIFTER_FALLBACK: Laerebedrift[] = [
  { id: "b1", navn: "Veidekke ASA", fag: "Tømrerfaget", fylke: "Oslo", kontakt: "laerling@veidekke.no", url: "https://www.veidekke.no" },
  { id: "b2", navn: "Eltel Networks", fag: "Elektriker", fylke: "Oslo", kontakt: null, url: "https://www.eltelnetworks.no" },
  { id: "b3", navn: "Helse Sør-Øst", fag: "Helsearbeiderfaget", fylke: "Viken", kontakt: null, url: "https://www.helse-sorost.no" },
  { id: "b4", navn: "Bravida Norge", fag: "Rørleggerfaget", fylke: "Trøndelag", kontakt: null, url: "https://www.bravida.no" },
];

// ---------------------------------------------------------------------------
// ProgramCard — fagbrev-kortet
// ---------------------------------------------------------------------------

function FagbrevCard({ fagbrev }: { fagbrev: TradeCertificate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm">{fagbrev.tittel}</h3>
          </div>
          {fagbrev.lonn && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 ml-6">
              {formaterLonnFagarbeider(fagbrev.lonn)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {fagbrev.url && (
            <a
              href={fagbrev.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            aria-label={expanded ? "Skjul" : "Vis mer"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-6 space-y-2">
          <p className="text-xs text-muted-foreground">{fagbrev.beskrivelse}</p>
          {fagbrev.nusCode && (
            <Badge variant="outline" className="text-xs">NUS: {fagbrev.nusCode}</Badge>
          )}
          <p className="text-xs text-muted-foreground">
            Lærlingtid: typisk 2 år i bedrift etter Vg2.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BedriftCard — lærebedrift-kortet
// ---------------------------------------------------------------------------

function BedriftCard({ bedrift }: { bedrift: Laerebedrift }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{bedrift.navn}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              {bedrift.fag}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {bedrift.fylke}
            </span>
          </div>
        </div>
        {bedrift.url && (
          <a
            href={bedrift.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {bedrift.kontakt && (
        <p className="text-xs text-muted-foreground">
          Kontakt: <a href={`mailto:${bedrift.kontakt}`} className="underline">{bedrift.kontakt}</a>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LaerlingPage() {
  const [search, setSearch] = useState("");
  const [valgtFylke, setValgtFylke] = useState<string>("alle");
  const [aktiveTab, setAktiveTab] = useState<"fagbrev" | "bedrifter">("fagbrev");

  const [fagbrev, setFagbrev] = useState<TradeCertificate[]>(FAGBREV_FALLBACK);
  const [bedrifter, setBedrifter] = useState<Laerebedrift[]>(BEDRIFTER_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetchTradeCertificates(undefined, 200),
      fetchLaerebedrifter(undefined, undefined, 200),
    ]).then(([fagRes, bedRes]) => {
      if (cancelled) return;

      if (fagRes.status === "fulfilled" && fagRes.value.length > 0) {
        setFagbrev(fagRes.value);
        setFromFirestore(true);
      }
      if (bedRes.status === "fulfilled" && bedRes.value.length > 0) {
        setBedrifter(bedRes.value);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const filteredFagbrev = useMemo(() => {
    if (!search.trim()) return fagbrev;
    const q = search.toLowerCase();
    return fagbrev.filter((f) =>
      f.tittel.toLowerCase().includes(q) ||
      f.beskrivelse.toLowerCase().includes(q)
    );
  }, [fagbrev, search]);

  const filteredBedrifter = useMemo(() => {
    let list = bedrifter;
    if (valgtFylke !== "alle") {
      list = list.filter((b) => b.fylke === valgtFylke);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.navn.toLowerCase().includes(q) ||
        b.fag.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bedrifter, valgtFylke, search]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Lærling og yrkesfag</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Utforsk fagbrev, svennebrev og lærebedrifter. Finn din vei til fagarbeider-yrket.
        </p>
        {!loading && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {fromFirestore
              ? `${fagbrev.length} fagbrev fra utdanning.no`
              : `${fagbrev.length} fagbrev (eksempeldata — Firestore ikke lastet)`}
          </p>
        )}
      </div>

      {/* Statistikk-kort */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{fagbrev.length}</p>
            <p className="text-xs text-muted-foreground">Fagbrev</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{bedrifter.length}</p>
            <p className="text-xs text-muted-foreground">Lærebedrifter</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">2 år</p>
            <p className="text-xs text-muted-foreground">Typisk lærlingtid</p>
          </CardContent>
        </Card>
      </div>

      {/* Lærlingveien — informasjonskort */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Veien til fagbrev</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>Vg1</strong> — Velg yrkesfaglig utdanningsprogram (f.eks. Bygg og anleggsteknikk)</p>
          <p><strong>Vg2</strong> — Spesialisering (f.eks. Tømrerfaget)</p>
          <p><strong>Vg3 / Lærlingtid</strong> — 2 år som lærling i godkjent bedrift (betalt)</p>
          <p><strong>Fagprøve</strong> — Bestått prøve gir fagbrev / svennebrev</p>
          <p className="mt-2">
            <a
              href="https://utdanning.no/tema/hjelp_til_utdanningsvalget/yrkesfag"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Les mer om yrkesfag på utdanning.no →
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Søk + filtre */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk fagbrev, bedrift…"
            className="pl-9"
          />
        </div>
        {aktiveTab === "bedrifter" && (
          <Select value={valgtFylke} onValueChange={setValgtFylke}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Velg fylke" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle fylker</SelectItem>
              {NORSKE_FYLKER.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["fagbrev", "bedrifter"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAktiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              aktiveTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "fagbrev" ? `Fagbrev (${filteredFagbrev.length})` : `Lærebedrifter (${filteredBedrifter.length})`}
          </button>
        ))}
      </div>

      {/* Innhold */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : aktiveTab === "fagbrev" ? (
        <div className="space-y-3">
          {filteredFagbrev.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ingen fagbrev matcher søket ditt.
            </p>
          ) : (
            filteredFagbrev.map((f) => <FagbrevCard key={f.id} fagbrev={f} />)
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBedrifter.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ingen lærebedrifter matcher filtrene dine.
            </p>
          ) : (
            filteredBedrifter.map((b) => <BedriftCard key={b.id} bedrift={b} />)
          )}
          <div className="pt-2 text-center">
            <a
              href="https://utdanning.no/laereplasser"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline underline-offset-2"
            >
              Finn alle lærebedrifter på utdanning.no →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
