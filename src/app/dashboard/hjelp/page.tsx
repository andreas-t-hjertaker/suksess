"use client";

/**
 * In-app hjelpesenter — brukerstøtte for elever (Issue #137)
 *
 * Inneholder:
 * - Ofte stilte spørsmål (FAQ)
 * - Hurtigguider for funksjoner
 * - Kontaktskjema for support
 * - GDPR-informasjon
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MessageCircle,
  Shield,
  Sparkles,
  GraduationCap,
  Compass,
  ScrollText,
  BarChart2,
  Send,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// FAQ-data
// ---------------------------------------------------------------------------

type FaqItem = {
  question: string;
  answer: string;
  category: "generelt" | "personvern" | "ai" | "karriere" | "teknisk";
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Hva er Suksess?",
    answer:
      "Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. " +
      "Vi hjelper deg med å utforske karrieremuligheter, forstå dine styrker og interesser, " +
      "og planlegge veien videre etter videregående.",
    category: "generelt",
  },
  {
    question: "Er Suksess gratis?",
    answer:
      "Suksess tilbyr en gratisversjon med grunnleggende funksjoner. " +
      "Utvidede funksjoner som AI-veileder og avansert karriereanalyse " +
      "krever abonnement gjennom skolen din.",
    category: "generelt",
  },
  {
    question: "Hvordan fungerer personlighetstesten?",
    answer:
      "Personlighetstesten bruker to anerkjente psykologiske rammeverk: " +
      "Big Five (OCEAN) for personlighetstrekk og RIASEC for yrkesinteresser. " +
      "Resultatene brukes til å foreslå karrierestier som passer deg. " +
      "Du kan ta testen på nytt når som helst.",
    category: "ai",
  },
  {
    question: "Erstatter AI-veilederen en ekte rådgiver?",
    answer:
      "Nei. AI-veilederen er et verktøy for utforsking og refleksjon, ikke en erstatning " +
      "for profesjonell karriereveiledning. For viktige beslutninger anbefaler vi at du " +
      "også snakker med rådgiver eller helsesykepleier på skolen.",
    category: "ai",
  },
  {
    question: "Hva gjør dere med dataene mine?",
    answer:
      "Vi tar personvern på alvor. Dine data lagres i Firebase Firestore i EU (europe-west1). " +
      "Vi deler IKKE data med tredjeparter. Du kan eksportere alle dine data (GDPR Art. 20) " +
      "og be om sletting (GDPR Art. 17) fra 'Mine data'-siden.",
    category: "personvern",
  },
  {
    question: "Kan foreldrene mine se dataene mine?",
    answer:
      "Nei, foreldrene dine har ikke tilgang til dine data med mindre du selv velger å dele dem. " +
      "Hvis du er under 16 år, trenger du foreldrenes samtykke for å bruke tjenesten.",
    category: "personvern",
  },
  {
    question: "Hvordan sletter jeg kontoen min?",
    answer:
      "Gå til 'Mine data'-siden i dashboardet. Der kan du laste ned alle dine data " +
      "og slette kontoen din. Sletting er permanent og kan ikke angres.",
    category: "personvern",
  },
  {
    question: "Hva er RIASEC-kode?",
    answer:
      "RIASEC er et rammeverk som beskriver seks yrkesinteresser: " +
      "Realistisk (R), Forskende (I), Kunstnerisk (A), Sosial (S), " +
      "Entreprenant (E) og Konvensjonell (C). Din RIASEC-kode viser dine tre sterkeste interesser.",
    category: "karriere",
  },
  {
    question: "Hvordan beregnes SO-poeng?",
    answer:
      "SO-poeng (Samordna Opptak) beregnes fra dine karakterer. " +
      "Skolepoeng = karaktersnitt × 10 + eventuelle tilleggspoeng. " +
      "Bruk karakterkalkulatoren i Suksess for å beregne dine poeng.",
    category: "karriere",
  },
  {
    question: "Appen fungerer ikke — hva gjør jeg?",
    answer:
      "Prøv disse stegene: 1) Last inn siden på nytt (Ctrl+Shift+R). " +
      "2) Tøm nettleserens cache. 3) Prøv en annen nettleser. " +
      "4) Sjekk statussiden (suksess.no/status). " +
      "Hvis problemet vedvarer, kontakt oss via skjemaet nedenfor.",
    category: "teknisk",
  },
];

const CATEGORY_LABELS: Record<FaqItem["category"], string> = {
  generelt: "Generelt",
  personvern: "Personvern",
  ai: "AI & analyse",
  karriere: "Karriere",
  teknisk: "Teknisk",
};

// ---------------------------------------------------------------------------
// Hurtigguider
// ---------------------------------------------------------------------------

type QuickGuide = {
  title: string;
  description: string;
  href: string;
  icon: typeof Sparkles;
};

const QUICK_GUIDES: QuickGuide[] = [
  {
    title: "Kom i gang med AI-veilederen",
    description: "Lær hvordan du bruker AI-veilederen for karriereveiledning.",
    href: "/dashboard/veileder",
    icon: Sparkles,
  },
  {
    title: "Ta personlighetstesten",
    description: "Fullfør Big Five og RIASEC-testene for å finne dine styrker.",
    href: "/dashboard/analyse",
    icon: BarChart2,
  },
  {
    title: "Utforsk karrierestier",
    description: "Se hvilke yrker og studieprogram som passer din profil.",
    href: "/dashboard/karriere",
    icon: Compass,
  },
  {
    title: "Bygg din CV",
    description: "Lag en profesjonell CV med AI-forslag.",
    href: "/dashboard/cv",
    icon: ScrollText,
  },
  {
    title: "Beregn SO-poeng",
    description: "Se hvor mange poeng du har og hva du trenger for drømmestudiet.",
    href: "/dashboard/karakterer",
    icon: GraduationCap,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HjelpPage() {
  const [search, setSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<FaqItem["category"] | "alle">("alle");
  const [contactMessage, setContactMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactError, setContactError] = useState(false);

  const filteredFaq = FAQ_ITEMS.filter((item) => {
    const matchesSearch =
      !search ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "alle" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  async function handleContact() {
    if (!contactMessage.trim()) return;
    setSending(true);
    setContactError(false);
    try {
      // Simuler sending — i produksjon sendes til e-post/Firestore
      await new Promise((r) => setTimeout(r, 1000));
      setSent(true);
      setContactMessage("");
      setContactEmail("");
    } catch {
      setContactError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Hjelpesenter
        </h1>
        <p className="text-muted-foreground">
          Finn svar på spørsmålene dine eller kontakt oss for hjelp.
        </p>
      </div>

      {/* Søk */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Søk i hjelpesenteret…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          aria-label="Søk i hjelpesenteret"
        />
      </div>

      {/* Hurtigguider */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Hurtigguider
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_GUIDES.map((guide) => (
            <a key={guide.href} href={guide.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardContent className="flex items-start gap-3 py-4">
                  <guide.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{guide.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {guide.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Ofte stilte spørsmål
        </h2>

        {/* Kategorifilter */}
        <div className="flex flex-wrap gap-2">
          {(["alle", "generelt", "personvern", "ai", "karriere", "teknisk"] as const).map(
            (cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="text-xs"
              >
                {cat === "alle" ? "Alle" : CATEGORY_LABELS[cat]}
              </Button>
            )
          )}
        </div>

        <div className="space-y-2">
          {filteredFaq.map((item, index) => (
            <Card key={index}>
              <button
                className="w-full text-left"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                aria-expanded={expandedFaq === index}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.question}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {CATEGORY_LABELS[item.category]}
                  </Badge>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </CardContent>
              </button>
              {expandedFaq === index && (
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
          {filteredFaq.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Ingen resultater for «{search}». Prøv et annet søkeord.
            </p>
          )}
        </div>
      </div>

      {/* Kontaktskjema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Kontakt oss
          </CardTitle>
          <CardDescription>
            Fant du ikke svaret? Send oss en melding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {contactError ? (
            <ErrorState
              message="Kunne ikke sende meldingen. Prøv igjen."
              onRetry={handleContact}
            />
          ) : sent ? (
            <div className="text-center py-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Takk for meldingen! Vi svarer innen 1–2 virkedager.
              </p>
            </div>
          ) : (
            <>
              <Input
                placeholder="Din e-postadresse (valgfritt)"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                aria-label="E-postadresse"
              />
              <textarea
                placeholder="Beskriv hva du trenger hjelp med…"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
                aria-label="Melding"
              />
              <Button
                onClick={handleContact}
                disabled={!contactMessage.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send melding
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Nyttige lenker */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>
          <a href="/personvern" className="underline hover:text-foreground">
            Personvernerklæring
          </a>
          {" · "}
          <a href="/legal" className="underline hover:text-foreground">
            Vilkår for bruk
          </a>
          {" · "}
          <a href="/status" className="underline hover:text-foreground">
            Systemstatus
          </a>
        </p>
      </div>
    </div>
  );
}
