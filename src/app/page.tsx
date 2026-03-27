"use client";

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
} from "lucide-react";
import { BlurIn, SlideIn, ScrollReveal, StaggerList, StaggerItem } from "@/components/motion";

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
  },
  {
    icon: Compass,
    title: "Karrierestiutforsker",
    description:
      "AI-drevet matching mellom personlighetsprofil og hundrevis av studieretninger og karriereveier. Finn det perfekte passet.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: GraduationCap,
    title: "Karakterkalkulator",
    description:
      "Registrer karakterer, beregn SO-poeng og se hvilke studier du kan komme inn på. Hva-om-simulator for å planlegge neste semester.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Bot,
    title: "AI-studieveileder",
    description:
      "Personlig veileder som kjenner profilen din, karakterene dine og interessene dine. Svarer med kildehenvisninger fra utdanning.no.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Sparkles,
    title: "Adaptiv UI",
    description:
      "Grensesnittet tilpasser seg personlighetsprofilen din. Analytiske elever får detaljerte tabeller; kreative får rik visuell presentasjon.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: TrendingUp,
    title: "Fremgangsoppfølging",
    description:
      "Fra VGS-valg til høyere utdanning og karriere. Suksess følger eleven gjennom hele utdanningsløpet.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
];

const stats = [
  { value: "1 av 3", label: "elever dropper ut av valgt studie" },
  { value: "68%", label: "oppgir feil valg som årsak" },
  { value: "15 min", label: "tar personlighetstesten" },
];

const pricingPlans = [
  {
    name: "Pilotkole",
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
    desc: "Rådgivere får aggregert innsikt (anonymisert) og kan identifisere elever som trenger ekstra støtte.",
  },
];

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <Star className="h-5 w-5 text-primary" />
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
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hovedinnhold */}
      <main id="main-content" tabIndex={-1}>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-3xl">
          <SlideIn direction="up" duration={0.5}>
            <Badge variant="outline" className="mb-5 gap-1.5 font-medium">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-drevet studieveiledning for norske elever
            </Badge>
          </SlideIn>
          <BlurIn delay={0.1} duration={0.7}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl leading-tight">
              Din personlige vei{" "}
              <span className="text-primary">til suksess</span>
            </h1>
          </BlurIn>
          <SlideIn direction="up" delay={0.2} duration={0.5}>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Suksess hjelper VGS-elever finne studieretningen som passer dem best —
              basert på personlighet, interesser og karakterer. Ikke på tilfeldigheter.
            </p>
          </SlideIn>
          <SlideIn direction="up" delay={0.35} duration={0.5}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Start personlighetstesten
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#priser">
                <Button variant="outline" size="lg">
                  Registrer skolen din
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
                <p className="text-2xl font-bold sm:text-3xl">{s.value}</p>
                <p className="text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </SlideIn>
      </section>

      {/* Hvordan det virker */}
      <section id="hvordan" className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Slik virker det
              </h2>
              <p className="mt-2 text-muted-foreground">
                Fra personlighetstest til informert studievalg på under 20 minutter.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, i) => (
              <ScrollReveal key={step.step} direction="up" delay={i * 0.1}>
                <div className="relative space-y-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {step.step}
                  </div>
                  {i < howItWorks.length - 1 && (
                    <ChevronRight className="absolute top-2 -right-3 h-5 w-5 text-muted-foreground/30 hidden lg:block" />
                  )}
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Funksjoner */}
      <section id="funksjoner" className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <ScrollReveal direction="up">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Alt eleven trenger
              </h2>
              <p className="mt-2 text-muted-foreground">
                En komplett plattform for informerte utdanningsvalg.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} direction="up" delay={i * 0.07}>
                <div className="group flex flex-col gap-4 rounded-xl border border-border/50 p-5 transition-all hover:border-border hover:shadow-sm">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.bg}`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
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

      {/* For skoler */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-5">
                <Badge variant="outline" className="gap-1.5">
                  <School className="h-3 w-3" />
                  For skoler og rådgivere
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
                  { label: "Elever per rådgiver", value: "120+" },
                  { label: "Tid spart per veiledning", value: "40%" },
                  { label: "Bedre studievalg", value: "2× mer" },
                  { label: "Frafallsrisiko redusert", value: "Estimert 25%" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border bg-background p-5 space-y-1"
                  >
                    <p className="text-2xl font-bold">{stat.value}</p>
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
                  className={`flex flex-col rounded-xl border p-6 h-full ${
                    plan.highlighted
                      ? "border-primary shadow-lg bg-primary/5 ring-1 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="mb-3 w-fit">Mest populær</Badge>
                  )}
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="mt-2 mb-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
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
      <section className="border-t border-border/40 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <ScrollReveal direction="up">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Klar til å hjelpe elevene dine lykkes?
            </h2>
            <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
              Sett opp Suksess for skolen din på 10 minutter. Ingen teknisk kompetanse nødvendig.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <Button variant="secondary" size="lg" className="gap-2">
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
              <Star className="h-4 w-4 text-primary" />
              <span>Suksess</span>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
              <Link href="/personvern" className="hover:text-foreground transition-colors">
                Personvern
              </Link>
              <Link href="/vilkar" className="hover:text-foreground transition-colors">
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
