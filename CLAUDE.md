# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Status (april 2026)

**150 issues opprettet — ~117 lukket, 33 åpne.** Deploy til produksjon 25. mars 2026 (Firebase Hosting + Cloud Functions).

3 kodeauditer, 5 strategisk research, 3 UX-research, 1 B2B-research, 1 kodeaudit+sikkerhet-research gjennomført.

### Åpne issues (33 stk)

#### MUST-HAVE (9 stk)
- **#110** — Stripe: EHF/Peppol betalingsintegrasjon for B2B skolelisenser
- **#127** — B2B Skole-onboarding: self-service oppsett for skoler
- **#128** — Ekte karrieredata: koble karrierestiutforsker til NAV/SSB/utdanning.no
- **#134** — Skole self-service dashboard: lisensforvaltning og GDPR-oversikt
- **#139** — Next.js Middleware: ruteautentisering og CSRF-beskyttelse
- **#140** — Loading states og feilhåndtering: robusthet i alle dashboard-sider
- **#141** — AI Chat-sikkerhet for mindreårige: påminnelser, sesjonslengde, guardrails
- **#145** — Cloud Functions rate limiting: server-side bruker-basert
- **#149** — Environment-konfigurasjon: .env.example, validering, secret management

#### SHOULD-HAVE (20 stk)
- **#102** — PWA offline-strategi (Service Worker)
- **#105** — Tilbakemeldingssystem: elev-feedback på AI-svar
- **#106** — Foresatt-portal: innsyn for foreldre
- **#107** — Samordna Opptak live-data
- **#111** — E-postintegrasjon (transaksjonelle e-poster)
- **#115** — Karrieredata-oppdatering (energiomstilling, AI/ML, bærekraft)
- **#116** — PWA: offline-støtte med Serwist
- **#129** — Jobbmatch med ekte stillinger fra NAV
- **#130** — Personlig karrierehandlingsplan (AI-generert)
- **#131** — Nynorsk-støtte (i18n)
- **#133** — Karrierekompetanse-rammeverk (HK-dir)
- **#135** — Feide gruppe-synkronisering
- **#136** — Tenant-basert feature flags
- **#137** — Brukerstøtte: in-app hjelpesenter
- **#142** — FINT-integrasjon: fylkeskommunal felleskomponent for elevdata
- **#143** — Onboarding analytics: fullføringsrate, TTV, aktivering
- **#144** — Søknadscoach: ekte trenddata fra Samordna Opptak
- **#146** — Tilgjengelighet: ARIA-attributter og tastaturnavigasjon
- **#148** — Dark mode: konsistent implementering + personalityzation
- **#150** — Sikkerhetstesting: OWASP-scanning og penetrasjonstest

#### NICE-TO-HAVE (4 stk)
- **#108** — Rådgiver-elev sanntidschat
- **#132** — AI Intervjutrener
- **#138** — Statusside og systemovervåking
- **#147** — Nasjonal vitnemålsdatabase (NVB): automatisk karakterimport

### Lukkede issues (utvalg, nyeste)
- **#112** — Fjern hardkodede Firebase-credentials ✅
- **#104** — Ytelsesoptimalisering ✅
- **#101** — Bundle-optimalisering ✅
- **#100** — Produksjonsovervåking ✅
- **#99** — SEO og metadata ✅
- **#97** — Content Security Policy ✅
- **#96** — Feilsider ✅
- **#94** — Krisedeteksjon ✅
- **#93** — AI Chat sikkerhet ✅
- **#92** — Sikkerhets-hardening ✅
- **#57–#82** — Kodeaudit, strategisk research, UX-research ✅

## Repo og issues

- **Repo:** `andreas-t-hjertaker/suksess`
- **Firebase-prosjekt:** `suksess-842ed` (europe-west1)

### Finn issues

```bash
# Alle åpne issues
gh issue list --repo andreas-t-hjertaker/suksess --state open

# Alle issues (inkl. lukkede)
gh issue list --repo andreas-t-hjertaker/suksess --state all --limit 150

# Se ett spesifikt issue
gh issue view <nummer> --repo andreas-t-hjertaker/suksess

# Filtrer på labels
gh issue list --repo andreas-t-hjertaker/suksess --label "must-have"
gh issue list --repo andreas-t-hjertaker/suksess --label "should-have"

# Søk i issues
gh issue list --repo andreas-t-hjertaker/suksess --state all --search "Feide"
```

## Tech stack

| Komponent | Teknologi |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | shadcn/ui v4, Tailwind CSS v4, Framer Motion v12 |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions Gen 2) |
| Auth | Feide OIDC → Firebase Custom Tokens + Google + Email + Anonymous |
| AI | Firebase AI (Gemini 2.5 Flash, VertexAI backend) + Cloud Functions hybrid |
| ML | K-means++ clustering (frontend lib, Cloud Run planlagt) |
| Vektor-DB | Weaviate Cloud (europe-west1) |
| Betaling | Stripe (B2B skolelisenser, planlagt) |
| Validering | Zod v4 (schemas.ts) |
| CI/CD | GitHub Actions (quality → test → staging → prod) |
| Observabilitet | Sentry, PostHog, Firebase Analytics |
| Region | europe-west1 (GDPR) |

## Mappestruktur med issue-referanser

```
suksess/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── admin/                     # Admin-dashboard (#16, #45, #54)
│   │   │   ├── brukere/page.tsx
│   │   │   ├── elever/page.tsx
│   │   │   ├── feature-flags/page.tsx # Feature flag admin (#136)
│   │   │   ├── radgivere/page.tsx
│   │   │   └── tenant/page.tsx
│   │   ├── api/chat/stream/route.ts   # SSE proxy for server-side LLM
│   │   ├── dashboard/
│   │   │   ├── abonnement/page.tsx    # Stripe (#110)
│   │   │   ├── analyse/page.tsx       # Personlighetsanalyse (#5)
│   │   │   ├── cv/page.tsx            # CV-builder (#14) ✅
│   │   │   ├── dokumenter/page.tsx    # Dokumenter ✅
│   │   │   ├── fremgang/page.tsx      # Gamification XP (#20) ✅
│   │   │   ├── innstillinger/page.tsx # Innstillinger ✅
│   │   │   ├── jobbmatch/page.tsx     # Jobbmatch (#129 — hardkodet)
│   │   │   ├── karakterer/page.tsx    # Karakterer (#10) ✅
│   │   │   ├── karriere/page.tsx      # Karrierestier (#128 — hardkodet)
│   │   │   ├── karrieregraf/page.tsx  # Karrieregraf (#128 — hardkodet)
│   │   │   ├── mentoring/page.tsx     # Karrierementoring (NY — mock-data)
│   │   │   ├── mine-data/page.tsx     # GDPR dataeksport (#109)
│   │   │   ├── profil/page.tsx        # Brukerprofil ✅
│   │   │   ├── soknadscoach/page.tsx  # Søknadscoach (#114)
│   │   │   ├── stillinger/page.tsx    # Stillinger (NY — mock-data, #129)
│   │   │   ├── studier/page.tsx       # Studieprogram ✅
│   │   │   ├── utvikler/page.tsx      # API-nøkler ✅
│   │   │   └── veileder/page.tsx      # AI-veileder chat ✅
│   │   ├── legal/                     # Juridisk (#51, #55) ✅
│   │   ├── login/page.tsx             # Multi-auth ✅
│   │   ├── onboarding/               # Onboarding (#4)
│   │   ├── personvern/page.tsx        # Personvernerklæring ✅
│   │   ├── pricing/page.tsx           # Prisside (#110)
│   │   ├── robots.ts                  # SEO (#99) ✅
│   │   ├── sitemap.ts                 # SEO (#99) ✅
│   │   ├── error.tsx                  # Feilside (#96) ✅
│   │   └── not-found.tsx              # 404-side (#96) ✅
│   │
│   ├── components/
│   │   ├── analytics-provider.tsx     # Firebase Analytics ✅
│   │   ├── auth-provider.tsx          # Auth-kontekst ✅
│   │   ├── consent-banner.tsx         # GDPR-samtykke ✅
│   │   ├── error-boundary.tsx         # Error Boundary ✅
│   │   ├── json-ld.tsx                # Structured data (#99) ✅
│   │   ├── personality-provider.tsx   # Personlighetskontekst ✅
│   │   └── motion/                    # Framer Motion (11 komponenter) ✅
│   │
│   ├── hooks/                         # React hooks ✅
│   │
│   ├── lib/
│   │   ├── ai/                        # AI-tjenester ✅
│   │   ├── clustering/kmeans.ts       # K-means++ ✅
│   │   ├── firebase/                  # Firebase-konfig ✅
│   │   ├── gamification/
│   │   │   ├── quests.ts              # Ukentlige oppdrag (NY)
│   │   │   └── xp.ts                  # XP-system ✅
│   │   ├── gdpr/minor-consent.ts      # Samtykke mindreårige ✅
│   │   ├── i18n/locales.ts            # Bokmål (nynorsk: #131)
│   │   ├── karriere/data.ts           # 70+ karrierenoder (#128 — hardkodet)
│   │   ├── observability/logger.ts    # Strukturert logging ✅
│   │   ├── personality/               # Big Five/RIASEC ✅
│   │   ├── stripe/                    # Stripe (#110)
│   │   └── web-vitals.ts              # Core Web Vitals ✅
│   │
│   ├── modules/ai-assistant/          # AI-veileder ✅
│   │
│   └── types/
│       ├── domain.ts                  # Alle domenetyper ✅
│       ├── employer.ts                # Arbeidsgivertyper (NY)
│       ├── index.ts
│       ├── mentoring.ts               # Mentoring-typer (NY)
│       └── schemas.ts                 # Zod-skjemaer (NY, #113)
│
├── functions/                         # Firebase Cloud Functions Gen 2 ✅
│
├── .github/workflows/                 # CI/CD ✅
├── firestore.rules                    # Multi-tenant sikkerhet ✅
├── e2e/                               # Playwright E2E-tester ✅
└── CLAUDE.md                          # Denne filen
```

## Avhengigheter mellom åpne issues

```
B2B PIPELINE (kritisk for revenue):
  #110 (Stripe EHF/Peppol) → #127 (Skole-onboarding) → #134 (Skole-dashboard)
  #111 (E-post) → #127, #134, #137
  #135 (Feide grupper) → #127, #134
  #136 (Tenant feature flags) → #134

DATAKVALITET (erstatte mock med ekte):
  #128 (Ekte karrieredata) → #129 (Ekte stillinger) → #130 (Handlingsplan)
  #107 (Samordna Opptak live) → #128
  #115 (Karrieredata-oppdatering) → #128

COMPLIANCE:
  #103 (EU AI Act) — frist august 2026
  #109 (GDPR dataportabilitet)
  #114 (Samordna Opptak 2028-reform)
  #131 (Nynorsk) — krav for fylkeskommunalt salg

AI / UX:
  #117 (Gemini 2.5 migrasjon)
  #105 (Tilbakemeldingssystem) → #130, #132
  #130 (Handlingsplan) → #133 (Karrierekompetanse)
  #132 (Intervjutrener)

TESTING / KVALITET:
  #98 (Komponent-tester)
  #113 (Zod-validering)

PWA:
  #102 + #116 (offline + Serwist)

NICE-TO-HAVE:
  #108 (Rådgiver-elev chat)
  #137 (Hjelpesenter)
  #138 (Statusside)
```

### Anbefalt implementeringsrekkefølge

**Fase 1 — COMPLIANCE + TESTING (april 2026):**
#103 (EU AI Act) → #109 (GDPR portabilitet) → #98 (tester) → #113 (Zod)

**Fase 2 — B2B PIPELINE (april–mai 2026):**
#111 (E-post) → #110 (Stripe) → #127 (Skole-onboarding) → #134 (Skole-dashboard) → #135 (Feide grupper) → #136 (Feature flags)

**Fase 3 — DATAKVALITET (mai–juni 2026):**
#128 (Ekte karrieredata) → #129 (Ekte stillinger) → #115 (Karrieredata) → #107 (Samordna Opptak) → #114 (2028-reform)

**Fase 4 — AI + VERDI (juni–august 2026):**
#117 (Gemini 2.5) → #105 (Feedback) → #130 (Handlingsplan) → #132 (Intervjutrener) → #133 (Karrierekompetanse)

**Fase 5 — LOKALISERING + SUPPORT (august 2026):**
#131 (Nynorsk) → #137 (Hjelpesenter) → #138 (Statusside)

**Fase 6 — PWA + AVANSERT:**
#102/#116 (PWA) → #106 (Foresatt-portal) → #108 (Rådgiver-chat)

## Konvensjoner

- **Språk:** Norsk (bokmål) i all UI, issues og dokumentasjon.
- **GDPR:** VertexAI (europe-west1), App Check, DPIA, DPA-mal.
- **Branch-strategi:** Feature branches → PR → merge til main.
- **shadcn/ui v4:** `className`, IKKE `asChild`.
- **Cloud Functions:** Gen 2 med `onRequest` og stibasert ruting.
- **Testing:** Vitest (unit), Playwright (E2E).
- **Validering:** Zod v4 for Firestore document reads (`src/types/schemas.ts`).

## Research-filer

Detaljerte tekniske guider i `/research/`-mappen:

### Teknisk research (tidlig)
- `feide-oidc.md` — Feide OIDC-flyt, claims mapping, Firebase Custom Token
- `data-ingest.md` — utdanning.no, DBH, NAV, SSB, Samordna opptak
- `weaviate-kmeans.md` — Weaviate Cloud, NorSBERT4, hybrid search, k-means
- `observability-stripe.md` — Logging/metrics, EHF/Peppol-krav, MVA
- `firebase-ai-architecture.md` — Hybridarkitektur, VertexAI vs GoogleAI
- `nav-stillinger-api.md` — pam-stilling-feed, autentisering, STYRK→RIASEC
- `gdpr-minors-norway.md` — Aldersgrense 15 år, samtykke, DPIA, Datatilsynet

### Kodeaudit-rapporter (mars 2026)
- `utdanning-data-sources.md` — Verifiserte API-er: Studievelgeren (1395 programmer), Grep/Udir 6588 fagkoder
- `pwa-mobile-strategy.md` — Serwist anbefalt, 97% smarttelefon-dekning
- `education-finance-data.md` — Lånekassen ingen API, old.api.utdanning.no 118 endepunkter
- `ai-safety-guardrails.md` — Gemini safety settings, EU AI Act aug 2026

### Strategisk research (mars 2026)
- `universell-utforming.md` — WCAG 2.2 AA, IKT-forskriften, UUtilsynet, EAA
- `laeringsanalyse-skoler.md` — Rådgiverdashbord, RBAC, trafikklys-modell, GDPR
- `onboarding-personlighetstest.md` — BFI-20, RIASEC UX, progressiv profiling
- `gamification-motivasjon.md` — SDT, Octalysis, badges/XP/streaks, etikk
- `arbeidsgiver-mentoring.md` — Handshake-modell, Ungdomsløftet, RIASEC-matching

### UX-research (mars 2026)
- `edtech-ux-patterns.md` — Duolingo, Khan Academy, Brilliant, Headspace, Notion
- `gen-z-ux-trends.md` — Gen Z design, personalityzation, onboarding, dashboard
- `../ux-audit-kodebase.md` — Full UX-audit: 26+ sider, 40 komponenter

### B2B/Produksjonsklarhet-research (mars 2026)
- Karriereveiledning.no (HK-dir): Gratis digital karriereveiledning, AI-verktøy
- Karriereverktøy.no: Norges mest brukte karriereveiledningsverktøy (sertifisering)
- EU AI Act: Høyrisiko for utdanning+AI for mindreårige, frist aug 2026
- Regjeringens digitaliseringsstrategi: Feide som datadelingsplattform
- Datatilsynet AVT-prosjekt: Læringsanalyse med Feide og GDPR
