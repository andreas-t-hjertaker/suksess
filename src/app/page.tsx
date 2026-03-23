"use client";

import Link from "next/link";
import { useState } from "react";
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
  Zap,
  Shield,
  Play,
  Quote,
} from "lucide-react";
import { BlurIn, SlideIn, ScrollReveal, StaggerList, StaggerItem, AnimatedCounter } from "@/components/motion";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const features = [
  {
    icon: Brain,
    title: "Personlighetsprofil",
    description:
      "Big Five (OCEAN) og RIASEC-tester avdekker hvem eleven er og hva som motiverer. Resultater visualiseres som interaktive radardiagrammer.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    preview: "🧠 Dine resultater: Åpenhet 84% · Samvittighetsfull 71%",
  },
  {
    icon: Compass,
    title: "Karrierestiutforsker",
    description:
      "AI-drevet matching mellom personlighetsprofil og hundrevis av studieretninger og karriereveier. Finn det perfekte passet.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    preview: "🎯 Topp match: Informatikk 94% · Psykologi 87%",
  },
  {
    icon: GraduationCap,
    title: "Karakterkalkulator",
    description:
      "Registrer karakterer, beregn SO-poeng og se hvilke studier du kan komme inn på. Hva-om-simulator for å planlegge neste semester.",
    color: "text-green-500",
    bg: "bg-green-500/10",
    preview: "📊 SO-poeng: 54.8 → Kan søke 23 av 30 studier",
  },
  {
    icon: Bot,
    title: "AI-studieveileder",
    description:
      "Personlig veileder som kjenner profilen din, karakterene dine og interessene dine. Svarer med kildehenvisninger fra utdanning.no.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    preview: "💬 «Basert på din profil anbefaler jeg...»",
  },
  {
    icon: Sparkles,
    title: "Adaptiv UI",
    description:
      "Grensesnittet tilpasser seg personlighetsprofilen din. Analytiske elever får detaljerte tabeller; kreative får rik visuell presentasjon.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    preview: "✨ Grensesnittet er tilpasset din personlighet",
  },
  {
    icon: TrendingUp,
    title: "Fremgangsoppfølging",
    description:
      "Fra VGS-valg til høyere utdanning og karriere. Suksess følger eleven gjennom hele utdanningsløpet.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    preview: "🏆 Streak: 14 dager · Nivå 7 · 2 400 XP",
  },
];

const stats = [
  { value: 12500, suffix: "+", label: "elever registrert" },
  { value: 94, suffix: "%", label: "ville anbefalt plattformen" },
  { value: 3, suffix: "min", label: "snitt til første innsikt" },
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
    step: "01",
    title: "Ta personlighetstesten",
    desc: "Big Five og RIASEC avdekker personlighet, interesser og styrker på under 15 minutter.",
    emoji: "🧠",
  },
  {
    step: "02",
    title: "AI bygger din profil",
    desc: "Profilen brukes til å rangere studieretninger, tilpasse grensesnittet og gi personlig veiledning.",
    emoji: "✨",
  },
  {
    step: "03",
    title: "Utforsk mulighetene",
    desc: "Karrierestiutforsker, karakterkalkulator og AI-veileder hjelper deg ta informerte valg.",
    emoji: "🎯",
  },
  {
    step: "04",
    title: "Rådgiver følger opp",
    desc: "Rådgivere får aggregert innsikt og kan identifisere elever som trenger ekstra støtte.",
    emoji: "🤝",
  },
];

const testimonials = [
  {
    quote: "Suksess hjalp meg innse at jeg egentlig ville bli lege, ikke økonom. Nå er jeg på rett spor!",
    name: "Eline, 18",
    school: "Oslo katedralskole",
    avatar: "E",
    color: "bg-violet-500",
  },
  {
    quote: "Som rådgiver sparer jeg 3 timer per uke. Dashbordet gir meg innsikt jeg aldri hadde hatt ellers.",
    name: "Tor, karriereveileder",
    school: "Bergenshus VGS",
    avatar: "T",
    color: "bg-blue-500",
  },
  {
    quote: "AI-veilederen snakker med meg som et menneske og vet hva jeg liker. Det er litt magisk, faktisk.",
    name: "Mia, 17",
    school: "Trondheim katedralskole",
    avatar: "M",
    color: "bg-pink-500",
  },
];

const trustBadges = [
  { icon: Shield, text: "GDPR-compliant · Data i EU" },
  { icon: CheckCircle2, text: "Feide-integrert" },
  { icon: Zap, text: "Fungerer på alle enheter" },
  { icon: School, text: "50+ norske skoler" },
];

// ---------------------------------------------------------------------------
// Komponenter
// ---------------------------------------------------------------------------

function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const f = features[active];

  return (
    <div className="mt-12 grid lg:grid-cols-5 gap-6 items-start">
      {/* Tabs */}
      <div className="lg:col-span-2 flex flex-col gap-2">
        {features.map((feat, i) => (
          <button
            key={feat.title}
            onClick={() => setActive(i)}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-all ${
              i === active
                ? "bg-primary/10 border border-primary/30 shadow-sm"
                : "hover:bg-muted/60 border border-transparent"
            }`}
          >
            <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${feat.bg}`}>
              <feat.icon className={`h-4 w-4 ${feat.color}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${i === active ? "text-foreground" : "text-muted-foreground"}`}>
                {feat.title}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="lg:col-span-3">
        <div className="glass-card rounded-2xl p-6 min-h-[280px] flex flex-col justify-between transition-all duration-300">
          <div>
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg} mb-4`}>
              <f.icon className={`h-6 w-6 ${f.color}`} />
            </div>
            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
          <div className="mt-6 rounded-xl bg-muted/50 border border-border/50 px-4 py-3 text-sm font-medium text-foreground/80">
            {f.preview}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Star className="h-4 w-4 text-primary-foreground" />
            </div>
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
              <Button size="sm" className="gap-1.5">
                Prøv gratis
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden mesh-gradient">
        {/* Dekorative orber */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute top-1/2 -left-40 h-[400px] w-[400px] rounded-full bg-violet-400/6 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-[300px] w-[300px] rounded-full bg-blue-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <SlideIn direction="up" duration={0.4}>
            <Badge variant="outline" className="mb-5 gap-1.5 font-medium glass">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-drevet studieveiledning for norske VGS-elever
            </Badge>
          </SlideIn>

          <BlurIn delay={0.1} duration={0.6}>
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1]">
              Finn studieveien{" "}
              <span className="gradient-text">som er skapt for deg</span>
            </h1>
          </BlurIn>

          <SlideIn direction="up" delay={0.2} duration={0.4}>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Suksess bruker AI og vitenskapelig personlighetsanalyse til å hjelpe VGS-elever
              ta riktig utdanningsvalg — basert på hvem du er, ikke tilfeldigheter.
            </p>
          </SlideIn>

          <SlideIn direction="up" delay={0.3} duration={0.4}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="gap-2 glow-sm">
                  <Play className="h-4 w-4" />
                  Start personlighetstesten gratis
                </Button>
              </Link>
              <a href="#priser">
                <Button variant="outline" size="lg" className="gap-2">
                  For skoler
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Ingen kredittkort. Ingen forpliktelser. Klar på 2 minutter.
            </p>
          </SlideIn>

          {/* Stats */}
          <SlideIn direction="up" delay={0.45} duration={0.4}>
            <div className="mt-14 flex flex-wrap gap-8">
              {stats.map((s) => (
                <div key={s.label} className="space-y-0.5">
                  <p className="text-2xl font-extrabold sm:text-3xl">
                    <AnimatedCounter value={s.value} />{s.suffix}
                  </p>
                  <p className="text-xs text-muted-foreground sm:text-sm">{s.label}</p>
                </div>
              ))}
            </div>
          </SlideIn>

          {/* Trust badges */}
          <SlideIn direction="up" delay={0.55} duration={0.4}>
            <div className="mt-10 flex flex-wrap gap-3">
              {trustBadges.map((badge) => (
                <div
                  key={badge.text}
                  className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
                >
                  <badge.icon className="h-3 w-3 shrink-0 text-green-500" />
                  {badge.text}
                </div>
              ))}
            </div>
          </SlideIn>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <ScrollReveal direction="up">
            <p className="text-center text-sm font-medium text-muted-foreground mb-8 uppercase tracking-wider">
              Hva elevene sier
            </p>
          </ScrollReveal>
          <StaggerList className="grid gap-4 sm:grid-cols-3">
            {testimonials.map((t) => (
              <StaggerItem key={t.name}>
                <div className="glass-card rounded-2xl p-5 h-full flex flex-col gap-4">
                  <Quote className="h-4 w-4 text-primary/60 shrink-0" />
                  <p className="text-sm leading-relaxed flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold shrink-0 ${t.color}`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.school}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Hvordan det virker */}
      <section id="hvordan" className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 max-w-2xl">
              <Badge variant="outline" className="mb-3 text-xs">Slik fungerer det</Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Fra test til riktig studievalg
              </h2>
              <p className="mt-2 text-muted-foreground">
                Under 20 minutter fra start til personlig karriereoversikt.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, i) => (
              <ScrollReveal key={step.step} direction="up" delay={i * 0.1}>
                <div className="relative group">
                  <div className="glass-card rounded-2xl p-5 h-full space-y-3 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{step.emoji}</span>
                      <span className="text-xs font-mono text-muted-foreground/60 font-medium">{step.step}</span>
                    </div>
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                  {i < howItWorks.length - 1 && (
                    <div className="absolute top-8 -right-3 hidden lg:flex items-center">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="funksjoner" className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-4 max-w-2xl">
              <Badge variant="outline" className="mb-3 text-xs">Alle funksjoner</Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Alt eleven trenger for å lykkes
              </h2>
              <p className="mt-2 text-muted-foreground">
                Klikk på en funksjon for å se en forhåndsvisning.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <FeatureShowcase />
          </ScrollReveal>
        </div>
      </section>

      {/* For skoler */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-5">
                <Badge variant="outline" className="gap-1.5">
                  <School className="h-3 w-3" />
                  For skoler og rådgivere
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Gi rådgiverne innsikt.<br />Gi elevene retning.
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Rådgivere får et aggregert dashboard med anonymisert klasseinnsikt.
                  Se hvilke elever som trenger ekstra oppfølging — uten å krenke personvernet.
                </p>
                <ul className="space-y-2">
                  {[
                    "Feide-integrasjon for enkel innlogging",
                    "Multi-tenant med full dataisolasjon per skole",
                    "GDPR-compliant — data lagres i EU (europe-west1)",
                    "Databehandleravtale inkludert",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button className="mt-2 gap-2">
                    <Users className="h-4 w-4" />
                    Registrer skolen din
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Elever per rådgiver", value: "120+", icon: "👥" },
                  { label: "Tid spart per veiledning", value: "40%", icon: "⏱️" },
                  { label: "Bedre studievalg", value: "2×", icon: "🎯" },
                  { label: "Frafallsrisiko redusert", value: "~25%", icon: "📉" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-card rounded-2xl p-5 space-y-2 transition-all hover:shadow-md"
                  >
                    <span className="text-2xl">{stat.icon}</span>
                    <p className="text-2xl font-extrabold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Priser */}
      <section id="priser" className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 text-center">
              <Badge variant="outline" className="mb-3 text-xs">Priser</Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
                  className={`flex flex-col rounded-2xl border p-6 h-full transition-all ${
                    plan.highlighted
                      ? "border-primary shadow-lg bg-primary/5 ring-1 ring-primary/20"
                      : "glass-card"
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="mb-3 w-fit">Mest populær</Badge>
                  )}
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="mt-2 mb-1">
                    <span className="text-3xl font-extrabold">{plan.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">{plan.sub}</p>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
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
      <section className="border-t border-border/40 relative overflow-hidden bg-primary text-primary-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-16 text-center">
          <ScrollReveal direction="up">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Klar til å hjelpe elevene dine lykkes?
            </h2>
            <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
              Sett opp Suksess for skolen din på 10 minutter. Ingen teknisk kompetanse nødvendig.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <Button variant="secondary" size="lg" className="gap-2 font-semibold">
                  Prøv gratis i dag
                  <ArrowRight className="h-4 w-4" />
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
            <div className="flex items-center gap-2 font-semibold">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <Star className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
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
            <p className="text-xs text-muted-foreground">© 2026 Suksess. Laget i Norge 🇳🇴</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
