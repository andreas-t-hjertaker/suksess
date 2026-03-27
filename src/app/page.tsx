"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Brain,
  Compass,
  GraduationCap,
  Bot,
  Star,
  CheckCircle2,
  School,
  Users,
  TrendingUp,
  Sparkles,
  ChevronRight,
  BarChart3,
  Quote,
} from "lucide-react";
import { BlurIn, SlideIn, ScrollReveal, StaggerList, StaggerItem, ScaleIn } from "@/components/motion";
import { RadarChart } from "@/components/radar-chart";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const features = [
  {
    icon: Brain,
    title: "Personlighetsprofil",
    description:
      "Big Five og RIASEC-tester avdekker hvem du er og hva som motiverer deg.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    span: "sm:col-span-2 sm:row-span-2",
  },
  {
    icon: Bot,
    title: "AI-studieveileder",
    description:
      "Personlig veileder som kjenner profilen din og svarer med kilder.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    span: "",
  },
  {
    icon: GraduationCap,
    title: "Karakterkalkulator",
    description:
      "Beregn SO-poeng og se hvilke studier du kan komme inn på.",
    color: "text-green-500",
    bg: "bg-green-500/10",
    span: "",
  },
  {
    icon: Compass,
    title: "Karrierestiutforsker",
    description:
      "AI-drevet matching mellom profilen din og hundrevis av karriereveier.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    span: "",
  },
  {
    icon: Sparkles,
    title: "Adaptiv UI",
    description:
      "Grensesnittet tilpasser seg personlighetsprofilen din automatisk.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    span: "",
  },
  {
    icon: TrendingUp,
    title: "Fremgangsoppfølging",
    description:
      "Fra VGS til karriere — Suksess følger deg gjennom hele utdanningsløpet.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    span: "sm:col-span-2",
  },
];

const stats = [
  { value: "1 av 3", label: "elever dropper ut av valgt studie" },
  { value: "68%", label: "oppgir feil valg som årsak" },
  { value: "15 min", label: "tar personlighetstesten" },
];

const pricingPlans = [
  {
    name: "Pilotskole",
    price: "Gratis",
    sub: "Inntil 100 elever",
    features: [
      "Personlighets- og interessetest",
      "Karakterkalkulator",
      "AI-studieveileder (50 kall/mnd)",
      "Rådgiver-dashboard",
    ],
    cta: "Start pilot",
    highlighted: false,
  },
  {
    name: "Skole",
    price: "49 kr",
    sub: "per elev per år",
    features: [
      "Alt i Pilotskole",
      "Ubegrenset AI-veileder",
      "Adaptiv UI-motor",
      "Frafallsrisiko-varslinger",
      "Integrasjon med Feide",
      "Dedikert onboarding",
    ],
    cta: "Registrer skolen",
    highlighted: true,
  },
  {
    name: "Kommune",
    price: "Kontakt oss",
    sub: "Skreddersydd avtale",
    features: [
      "Alt i Skole",
      "Multi-tenant arkitektur",
      "Databehandleravtale",
      "SLA-garanti",
      "Tilpasset integrasjon",
    ],
    cta: "Ta kontakt",
    highlighted: false,
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Eleven tar personlighetstesten",
    desc: "Big Five og RIASEC-testen avdekker personlighet, interesser og styrker på under 15 minutter.",
  },
  {
    step: "2",
    title: "AI-en bygger en profil",
    desc: "Profilen brukes til å rangere studieretninger, tilpasse grensesnittet og gi personlig veiledning.",
  },
  {
    step: "3",
    title: "Eleven utforsker muligheter",
    desc: "Karrierestiutforsker, karakterkalkulator og AI-veileder hjelper eleven ta informerte valg.",
  },
  {
    step: "4",
    title: "Rådgiver følger opp",
    desc: "Rådgivere får aggregert innsikt og kan identifisere elever som trenger ekstra støtte.",
  },
];

const testimonials = [
  {
    quote: "Endelig et verktøy som hjelper meg forstå hva jeg faktisk er interessert i. RIASEC-testen var en øyeåpner.",
    name: "Elev, Nydalen VGS",
    riasecCode: "AIS",
  },
  {
    quote: "Vi sparer timer på veiledning. Dashboardet gir oss innsikt vi aldri hadde før.",
    name: "Rådgiver, Bergen Katedralskole",
    riasecCode: "SIA",
  },
  {
    quote: "Karakterkalkulatoren viste meg at jeg faktisk kan komme inn på drømmestudiet mitt!",
    name: "Elev, Stavanger VGS",
    riasecCode: "IRA",
  },
];

// Mini-RIASEC smaksprøve (3 spørsmål)
const miniRiasecQuestions = [
  {
    id: "mini-1",
    text: "Jeg liker å jobbe med hendene — bygge, reparere eller lage noe fysisk.",
    types: ["realistic"],
  },
  {
    id: "mini-2",
    text: "Jeg foretrekker å analysere data og finne løsninger på komplekse problemer.",
    types: ["investigative"],
  },
  {
    id: "mini-3",
    text: "Jeg trives best når jeg kan hjelpe andre mennesker og jobbe i team.",
    types: ["social"],
  },
];

const RIASEC_LABELS: Record<string, string> = {
  realistic: "Praktisk",
  investigative: "Analytisk",
  social: "Sosial",
};

// ---------------------------------------------------------------------------
// Mini RIASEC Demo-komponent
// ---------------------------------------------------------------------------

function MiniRiasecDemo() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);

  const allAnswered = miniRiasecQuestions.every((q) => answers[q.id] !== undefined);

  function handleAnswer(qId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function getResult() {
    const scores: Record<string, number> = {};
    for (const q of miniRiasecQuestions) {
      for (const t of q.types) {
        scores[t] = (scores[t] || 0) + (answers[q.id] || 3);
      }
    }
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || "social";
  }

  const resultDescriptions: Record<string, string> = {
    realistic: "Du er en praktiker som liker å skape ting med hendene. Ingeniør, håndverker eller tekniker kan passe deg!",
    investigative: "Du er en analytiker som liker å grave dypt i problemer. Forskning, IT eller medisin kan være noe for deg!",
    social: "Du er en lagspiller som trives med mennesker. Helse, utdanning eller rådgivning kan passe deg!",
  };

  const topType = getResult();

  if (showResult) {
    const axes = [
      { label: "Praktisk", value: ((answers["mini-1"] || 3) / 5) * 100 },
      { label: "Analytisk", value: ((answers["mini-2"] || 3) / 5) * 100 },
      { label: "Kreativ", value: 50 },
      { label: "Sosial", value: ((answers["mini-3"] || 3) / 5) * 100 },
      { label: "Leder", value: 50 },
      { label: "Systematisk", value: 50 },
    ];

    return (
      <ScaleIn duration={0.5}>
        <div className="space-y-4 text-center">
          <div className="mx-auto w-fit">
            <RadarChart axes={axes} size={180} className="mx-auto" />
          </div>
          <div>
            <p className="text-lg font-semibold font-display">
              Du virker mest <span className="text-primary">{RIASEC_LABELS[topType]}</span>!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {resultDescriptions[topType]}
            </p>
          </div>
          <Link href="/login">
            <Button className="gap-2">
              Ta full test for komplett profil
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </ScaleIn>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {miniRiasecQuestions.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium">
              <span className="text-primary mr-1.5">{i + 1}.</span>
              {q.text}
            </p>
            <div className="flex gap-1.5" role="radiogroup" aria-label={q.text}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={answers[q.id] === v}
                  aria-label={`${v} av 5`}
                  onClick={() => handleAnswer(q.id, v)}
                  className={`flex h-9 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    answers[q.id] === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {v === 1 ? "😕" : v === 2 ? "🤔" : v === 3 ? "😐" : v === 4 ? "🙂" : "🤩"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {allAnswered && (
        <ScaleIn duration={0.3}>
          <Button onClick={() => setShowResult(true)} className="w-full gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Se resultatet
          </Button>
        </ScaleIn>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg" aria-label="Hovednavigasjon">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-bold font-display tracking-tight">
            <Star className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Suksess</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm md:flex">
            <a href="#hvordan" className="text-muted-foreground hover:text-foreground transition-colors">
              Hvordan det virker
            </a>
            <a href="#funksjoner" className="text-muted-foreground hover:text-foreground transition-colors">
              Funksjoner
            </a>
            <a href="#priser" className="text-muted-foreground hover:text-foreground transition-colors">
              Priser
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Logg inn</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">
                Prøv gratis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main id="main-content" tabIndex={-1}>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-3xl">
          <SlideIn direction="up" duration={0.5}>
            <Badge variant="outline" className="mb-5 gap-1.5 font-medium">
              <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
              AI-drevet studieveiledning for norske elever
            </Badge>
          </SlideIn>
          <BlurIn delay={0.1} duration={0.7}>
            <h1 className="text-fluid-hero font-bold font-display tracking-tight leading-tight">
              Finn din vei.{" "}
              <span className="text-primary">Vi hjelper deg dit.</span>
            </h1>
          </BlurIn>
          <SlideIn direction="up" delay={0.2} duration={0.5}>
            <p className="mt-5 text-fluid-lg text-muted-foreground max-w-2xl leading-relaxed">
              Suksess hjelper VGS-elever finne studieretningen som passer dem best —
              basert på personlighet, interesser og karakterer. Ikke på tilfeldigheter.
            </p>
          </SlideIn>
          <SlideIn direction="up" delay={0.35} duration={0.5}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Start gratis med Feide
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <a href="#prøv">
                <Button variant="outline" size="lg">
                  Se demo
                </Button>
              </a>
            </div>
          </SlideIn>
        </div>

        {/* Stats */}
        <SlideIn direction="up" delay={0.5} duration={0.5}>
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl">
            {stats.map((s) => (
              <div key={s.label} className="space-y-1">
                <p className="text-fluid-2xl font-bold font-display">{s.value}</p>
                <p className="text-fluid-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </SlideIn>
      </section>

      {/* Interaktiv mini-RIASEC demo */}
      <section id="prøv" className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-4">
                <Badge variant="outline" className="gap-1.5">
                  <Compass className="h-3 w-3" aria-hidden="true" />
                  Prøv selv — 30 sekunder
                </Badge>
                <h2 className="text-fluid-2xl font-bold font-display tracking-tight">
                  Hvem er du? Finn det ut nå.
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Svar på tre raske spørsmål og se hvilken personlighetstype du ligner mest på.
                  Den fulle testen gir et komplett bilde på under 15 minutter.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right">
              <div className="glass-card p-6">
                <MiniRiasecDemo />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Hvordan det virker */}
      <section id="hvordan" className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-fluid-2xl font-bold font-display tracking-tight">
                Slik virker det
              </h2>
              <p className="mt-2 text-muted-foreground">
                Fra personlighetstest til informert studievalg på under 20 minutter.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((s, i) => (
              <ScrollReveal key={s.step} direction="up" delay={i * 0.1}>
                <div className="relative space-y-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {s.step}
                  </div>
                  {i < howItWorks.length - 1 && (
                    <ChevronRight className="absolute top-2 -right-3 h-5 w-5 text-muted-foreground/30 hidden lg:block" aria-hidden="true" />
                  )}
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Funksjoner — Bento Grid */}
      <section id="funksjoner" className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-fluid-2xl font-bold font-display tracking-tight">
                Alt eleven trenger
              </h2>
              <p className="mt-2 text-muted-foreground">
                En komplett plattform for informerte utdanningsvalg.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} direction="up" delay={i * 0.07}>
                <div className={`group glass-card p-5 h-full flex flex-col gap-3 transition-all hover:scale-[1.02] hover:shadow-lg ${f.span}`}>
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.bg}`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-display">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sosial bevisføring */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 text-center">
              <h2 className="text-fluid-2xl font-bold font-display tracking-tight">
                Hva elevene sier
              </h2>
              <p className="mt-2 text-muted-foreground">
                Ekte opplevelser fra elever og rådgivere.
              </p>
            </div>
          </ScrollReveal>
          <StaggerList className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <StaggerItem key={t.name}>
                <div className="glass-card p-5 h-full flex flex-col gap-4">
                  <Quote className="h-5 w-5 text-primary/60" aria-hidden="true" />
                  <p className="text-sm leading-relaxed flex-1">{t.quote}</p>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">RIASEC: {t.riasecCode}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* For skoler */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-5">
                <Badge variant="outline" className="gap-1.5">
                  <School className="h-3 w-3" aria-hidden="true" />
                  For skoler og rådgivere
                </Badge>
                <h2 className="text-fluid-2xl font-bold font-display tracking-tight">
                  Gi rådgiverne innsikt. Gi elevene retning.
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Rådgivere får et aggregert dashboard med anonymisert klasseinnsikt.
                  Se hvilke elever som trenger ekstra oppfølging — uten å krenke personvernet.
                </p>
                <ul className="space-y-2">
                  {[
                    "Feide-integrasjon for enkel innlogging",
                    "Multi-tenant med full dataisolasjon per skole",
                    "GDPR-compliant — data lagres i EU",
                    "Databehandleravtale inkludert",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button className="mt-2 gap-2">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    Registrer skolen din
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Elever per rådgiver", value: "120+", icon: Users },
                  { label: "Tid spart per veiledning", value: "40%", icon: TrendingUp },
                  { label: "Bedre studievalg", value: "2× mer", icon: GraduationCap },
                  { label: "Frafallsrisiko", value: "−25%", icon: BarChart3 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-card p-5 space-y-2"
                  >
                    <stat.icon className="h-5 w-5 text-primary/60" aria-hidden="true" />
                    <p className="text-fluid-xl font-bold font-display">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Priser */}
      <section id="priser" className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 text-center">
              <h2 className="text-fluid-2xl font-bold font-display tracking-tight">
                Enkel og forutsigbar prising
              </h2>
              <p className="mt-2 text-muted-foreground">
                Start gratis. Skaler etter behov.
              </p>
            </div>
          </ScrollReveal>
          <StaggerList className="grid gap-6 sm:grid-cols-3">
            {pricingPlans.map((plan) => (
              <StaggerItem key={plan.name}>
                <div
                  className={`flex flex-col rounded-xl border p-6 h-full ${
                    plan.highlighted
                      ? "border-primary shadow-lg bg-primary/5 ring-1 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="mb-3 w-fit">Mest populær</Badge>
                  )}
                  <h3 className="font-bold font-display text-lg">{plan.name}</h3>
                  <div className="mt-2 mb-1">
                    <span className="text-fluid-2xl font-bold font-display">{plan.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">{plan.sub}</p>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/login">
                    <Button
                      variant={plan.highlighted ? "default" : "outline"}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* CTA-banner */}
      <section className="border-t border-border/40 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <ScrollReveal direction="up">
            <h2 className="text-fluid-2xl font-bold font-display">
              Klar til å hjelpe elevene dine lykkes?
            </h2>
            <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
              Sett opp Suksess for skolen din på 10 minutter. Ingen teknisk kompetanse nødvendig.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <Button variant="secondary" size="lg" className="gap-2">
                  Prøv gratis i dag
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <a href="mailto:hei@suksess.no">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Ta kontakt
                </Button>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-semibold font-display">
              <Star className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Suksess</span>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
              <Link href="/personvern" className="hover:text-foreground transition-colors">
                Personvern
              </Link>
              <Link href="/legal/vilkar" className="hover:text-foreground transition-colors">
                Vilkår
              </Link>
              <a href="mailto:hei@suksess.no" className="hover:text-foreground transition-colors">
                Kontakt
              </a>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 Suksess. Laget i Norge.</p>
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}
