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
  MessageSquare,
} from "lucide-react";
import { BlurIn, SlideIn, ScrollReveal, StaggerList, StaggerItem, AnimatedCounter } from "@/components/motion";
import { MiniRiasecQuiz } from "@/components/mini-riasec-quiz";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const bentoFeatures = [
  {
    icon: Bot,
    title: "AI-studieveileder",
    description:
      "Personlig veileder som kjenner profilen din, karakterene dine og interessene dine. Svarer med kildehenvisninger fra utdanning.no.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    span: "sm:col-span-2 sm:row-span-2",
    size: "large" as const,
  },
  {
    icon: Brain,
    title: "Personlighetsprofil",
    description:
      "Big Five og RIASEC avdekker hvem du er og hva som motiverer deg.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    span: "",
    size: "small" as const,
  },
  {
    icon: Compass,
    title: "Karrierestiutforsker",
    description:
      "AI-drevet matching mellom din profil og hundrevis av karriereveier.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    span: "",
    size: "small" as const,
  },
  {
    icon: GraduationCap,
    title: "Karakterkalkulator",
    description:
      "Beregn SO-poeng og se hvilke studier du kan komme inn på.",
    color: "text-green-500",
    bg: "bg-green-500/10",
    span: "",
    size: "small" as const,
  },
  {
    icon: Sparkles,
    title: "Adaptiv UI",
    description:
      "Grensesnittet tilpasser seg din personlighet automatisk.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    span: "",
    size: "small" as const,
  },
  {
    icon: BarChart3,
    title: "Rådgiverdashbord",
    description:
      "Aggregert klasseinnsikt for rådgivere — uten å krenke personvernet.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    span: "sm:col-span-2",
    size: "wide" as const,
  },
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
      "Rådgiverdashbord",
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
    desc: "Big Five og RIASEC avdekker personlighet, interesser og styrker på under 15 minutter.",
  },
  {
    step: "2",
    title: "AI-en bygger en profil",
    desc: "Profilen rangerer studieretninger, tilpasser grensesnittet og gir personlig veiledning.",
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

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 glass-card-subtle border-b border-border/40">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display font-bold tracking-tight">
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
                Start gratis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient bakgrunn */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10 dark:from-primary/10 dark:via-background dark:to-accent/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.52_0.2_265_/_0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.68_0.18_265_/_0.15),transparent)]" />

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-32 md:pb-28">
          <div className="max-w-3xl">
            <SlideIn direction="up" duration={0.5}>
              <Badge variant="outline" className="mb-6 gap-1.5 font-medium">
                <Sparkles className="h-3 w-3 text-primary" />
                AI-drevet studieveiledning for norske elever
              </Badge>
            </SlideIn>
            <BlurIn delay={0.1} duration={0.7}>
              <h1 className="text-fluid-hero">
                Finn din vei.{" "}
                <span className="text-primary">Vi hjelper deg dit.</span>
              </h1>
            </BlurIn>
            <SlideIn direction="up" delay={0.2} duration={0.5}>
              <p className="mt-6 text-fluid-lg text-muted-foreground max-w-2xl leading-relaxed">
                Suksess hjelper VGS-elever finne studieretningen som passer dem best —
                basert på personlighet, interesser og karakterer. Ikke på tilfeldigheter.
              </p>
            </SlideIn>
            <SlideIn direction="up" delay={0.35} duration={0.5}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button size="lg" className="gap-2 font-display font-semibold">
                    Start gratis med Feide
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#demo">
                  <Button variant="outline" size="lg" className="font-display">
                    Prøv en smakebit
                  </Button>
                </a>
              </div>
            </SlideIn>
          </div>

          {/* Stats */}
          <SlideIn direction="up" delay={0.5} duration={0.5}>
            <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl">
              {[
                { value: 3, prefix: "1 av ", label: "elever dropper ut av valgt studie" },
                { value: 68, suffix: "%", label: "oppgir feil valg som årsak" },
                { value: 15, suffix: " min", label: "tar personlighetstesten" },
              ].map((s) => (
                <div key={s.label} className="space-y-1">
                  <p className="text-fluid-2xl font-display font-bold">
                    {s.prefix}
                    <AnimatedCounter value={s.value} />
                    {s.suffix}
                  </p>
                  <p className="text-fluid-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </SlideIn>
        </div>
      </section>

      {/* Interaktiv demo (Brilliant-inspirert) */}
      <section id="demo" className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <ScrollReveal direction="up">
            <div className="mb-10 max-w-2xl mx-auto text-center">
              <Badge variant="outline" className="mb-4 gap-1.5">
                <MessageSquare className="h-3 w-3 text-primary" />
                Prøv selv
              </Badge>
              <h2 className="text-fluid-2xl font-display font-bold tracking-tight">
                Hvem er du? Ta en rask smakebit.
              </h2>
              <p className="mt-3 text-muted-foreground text-fluid-sm">
                Svar på 3 spørsmål og se din RIASEC-profil. Logg inn med Feide for full analyse.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <MiniRiasecQuiz />
          </ScrollReveal>
        </div>
      </section>

      {/* Hvordan det virker */}
      <section id="hvordan" className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <ScrollReveal direction="up">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-fluid-2xl font-display font-bold tracking-tight">
                Slik virker det
              </h2>
              <p className="mt-2 text-muted-foreground text-fluid-sm">
                Fra personlighetstest til informert studievalg på under 20 minutter.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, i) => (
              <ScrollReveal key={step.step} direction="up" delay={i * 0.1}>
                <div className="relative space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold">
                    {step.step}
                  </div>
                  {i < howItWorks.length - 1 && (
                    <ChevronRight className="absolute top-2.5 -right-3 h-5 w-5 text-muted-foreground/30 hidden lg:block" />
                  )}
                  <h3 className="font-display font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Funksjoner — Bento Grid */}
      <section id="funksjoner" className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <ScrollReveal direction="up">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-fluid-2xl font-display font-bold tracking-tight">
                Alt eleven trenger
              </h2>
              <p className="mt-2 text-muted-foreground text-fluid-sm">
                En komplett plattform for informerte utdanningsvalg.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bentoFeatures.map((f, i) => (
              <ScrollReveal key={f.title} direction="up" delay={i * 0.07}>
                <div
                  className={`group relative flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-5 transition-all hover:border-border hover:shadow-md dark:bg-card/50 dark:hover:bg-card/80 ${f.span} ${
                    f.size === "large" ? "min-h-[280px] justify-between" : ""
                  }`}
                >
                  <div>
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.bg}`}>
                      <f.icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <h3 className={`mt-3 font-display font-semibold ${f.size === "large" ? "text-fluid-lg" : ""}`}>
                      {f.title}
                    </h3>
                    <p className={`mt-1.5 text-muted-foreground leading-relaxed ${f.size === "large" ? "text-fluid-sm" : "text-sm"}`}>
                      {f.description}
                    </p>
                  </div>
                  {f.size === "large" && (
                    <div className="glass-card-subtle rounded-xl p-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <Bot className="h-3 w-3 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">AI-veileder</span>
                      </div>
                      <p className="italic">&quot;Basert på din RIASEC-profil (Investigative-Artistic) og karakterene dine i naturfag, anbefaler jeg...&quot;</p>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* For skoler */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-5">
                <Badge variant="outline" className="gap-1.5">
                  <School className="h-3 w-3" />
                  For skoler og rådgivere
                </Badge>
                <h2 className="text-fluid-2xl font-display font-bold tracking-tight">
                  Gi rådgiverne innsikt. Gi elevene retning.
                </h2>
                <p className="text-muted-foreground leading-relaxed text-fluid-sm">
                  Rådgivere får et aggregert dashboard med anonymisert klasseinnsikt.
                  Se hvilke elever som trenger ekstra oppfølging — uten å krenke personvernet.
                </p>
                <ul className="space-y-2.5">
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
                  <Button className="mt-2 gap-2 font-display">
                    <Users className="h-4 w-4" />
                    Registrer skolen din
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Elever per rådgiver", value: 120, suffix: "+" },
                  { label: "Tid spart per veiledning", value: 40, suffix: "%" },
                  { label: "Bedre studievalg", value: 2, suffix: "× mer" },
                  { label: "Frafallsrisiko redusert", value: 25, suffix: "%", prefix: "Est. " },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border bg-card dark:bg-card/50 p-5 space-y-1"
                  >
                    <p className="text-fluid-xl font-display font-bold">
                      {stat.prefix}
                      <AnimatedCounter value={stat.value} />
                      {stat.suffix}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Priser */}
      <section id="priser" className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <ScrollReveal direction="up">
            <div className="mb-12 text-center">
              <h2 className="text-fluid-2xl font-display font-bold tracking-tight">
                Enkel og forutsigbar prising
              </h2>
              <p className="mt-2 text-muted-foreground text-fluid-sm">
                Start gratis. Skaler etter behov.
              </p>
            </div>
          </ScrollReveal>
          <StaggerList className="grid gap-6 sm:grid-cols-3">
            {pricingPlans.map((plan) => (
              <StaggerItem key={plan.name}>
                <div
                  className={`flex flex-col rounded-2xl border p-6 h-full transition-shadow hover:shadow-md ${
                    plan.highlighted
                      ? "border-primary shadow-lg bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card dark:bg-card/50"
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="mb-3 w-fit">Mest populær</Badge>
                  )}
                  <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                  <div className="mt-2 mb-1">
                    <span className="text-fluid-2xl font-display font-bold">{plan.price}</span>
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
                      className="w-full font-display"
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
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <ScrollReveal direction="up">
            <h2 className="text-fluid-2xl font-display font-bold">
              Klar til å hjelpe elevene dine lykkes?
            </h2>
            <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto text-fluid-sm">
              Sett opp Suksess for skolen din på 10 minutter. Ingen teknisk kompetanse nødvendig.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <Button variant="secondary" size="lg" className="gap-2 font-display font-semibold">
                  Prøv gratis i dag
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="mailto:hei@suksess.no">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-display"
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
            <div className="flex items-center gap-2 font-display font-semibold">
              <Star className="h-4 w-4 text-primary" />
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
    </div>
  );
}
