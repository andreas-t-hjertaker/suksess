# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Status (mars 2026)

**82 issues totalt — 82 lukket (alle implementert ✅)**

PR #56 (64 commits, 110 filer, 8857 linjer) implementerte store deler av plattformen. Etter 3 kodeauditer ble 6 issues gjenåpnet og 15 nye issues opprettet. Deretter ble 10 UX-issues (#73–#82) opprettet basert på edtech-research. Alle 82 issues er nå implementert og TypeScript-builden er ren (0 feil).

### Gjenåpnede issues (IMPLEMENTERT ✅)
- **#34** ✅ — VertexAI Node SDK i functions/src/llm.ts med europe-west1 og GDPR-logging
- **#8** ✅ — Weaviate søkeproxy `/api/search` + NorSBERT4 embeddings (text2vec-huggingface)
- **#35** ✅ — RAG Pipeline integrert i `/llm/rag-chat` Cloud Function-endpoint
- **#47** ✅ — Chat-persistens type-feil rettet, conversation-store.ts fungerer korrekt
- **#11** ✅ — Ekte utdanning.no Studievelgeren API, Grep/Udir VGS-data, DBH-statistikk
- **#52** ✅ — Studiedata koblet til Firestore via utdanning-no-client.ts
- **#32** ✅ — Stripe B2B skolelisenser med prismodell og lisensadministrasjon

### Kodeaudit-issues (IMPLEMENTERT ✅)
- **#57** ✅ — AI Safety: BLOCK_LOW_AND_ABOVE på alle kategorier, PII-fjerning, krise-deteksjon, prompt-injeksjonsblokkering
- **#58** ✅ — Ekte studiedata: utdanning.no Studievelgeren API (~1395 programmer) + Grep VGS-fagkoder
- **#59** ✅ — PWA: service worker med offline-støtte, push-varsler, Web App Manifest med shortcuts
- **#60** ✅ — Samordna Opptak: DBH tabell 204, 5-års historikk, admissionHistory-collection
- **#62** ✅ — Lærling- og yrkesfagdata: laerling/page.tsx med fagbrev, lærebedrifter og lønnsnivå
- **#63** ✅ — Samtalehistorikk-UI: conversation-sidebar.tsx med slett-funksjon (GDPR)
- **#64** ✅ — Vertex AI Node SDK server-side (europe-west1, ADC, ingen API-nøkkel)
- **#65** ✅ — Weaviate søkeproxy: `/api/search` Next.js-rute + Cloud Function, holder API-nøkkel server-side
- **#66** ✅ — E2E testdekning: 11 Playwright-testfiler (auth, onboarding, AI-chat, GDPR, mobil, tilgjengelighet)

### Strategiske issues (IMPLEMENTERT ✅)
- **#67** ✅ — WCAG 2.2 AA: skip-lenker, fokusindikator, 44px touch-mål, ARIA-etiketter
- **#68** ✅ — Rådgiverdashbord: trafikklys-modell, periodefilter, CSV-eksport, notat-funksjon
- **#69** ✅ — Onboarding: gamifisert RIASEC + Big Five-flyt med XP, konfetti og personaliserte resultater
- **#70** ✅ — Gamification: XP/streak/badges, level-up overlay, ukentlige oppdrag, shield-varsel
- **#71** ✅ — Arbeidsgiverportal: lærlingplasser, employer branding, RIASEC-matching
- **#72** ✅ — Karrierementoring: RIASEC-basert elev↔mentor-matching, mentorprofiler

### UX-issues (IMPLEMENTERT ✅)
- **#73** ✅ — Landingsside: animert mesh-gradient hero, feature showcase med tabs, testimonials, AnimatedCounter stats
- **#74** ✅ — Design System: glassmorphism utilities (glass/glass-card/glass-dark), gradient-text, glow-primary, mesh-gradient, animate-float/pulse-glow, typografiskala, bento-grid
- **#75** ✅ — Onboarding UX: XP-system per steg, XP-toast (+30XP), konfetti-animasjon (CSS), XP-teller i steg-indikatorer, gamifisert welcome-steg
- **#76** ✅ — AI Chat UX: glassmorphism panel, AI-avatar, rounded-2xl bobler, hover-handlinger (kopier/thumbs), kontekst-spesifikke forslag, minimer-funksjon
- **#77** ✅ — Dashboard: Bento Grid med profilerkort (2×2), XP/streak/karaktersnitt/fremgang-widgets, gradient-bakgrunner, BentoCard-wrapper
- **#78** ✅ — Mobil UX: glassmorphism bottom nav, active pill-indikator, taktil feedback (vibrate), BottomSheet-komponent med drag-to-dismiss, safe-area CSS, fluid typografi
- **#79** ✅ — Navigasjon: CommandPalette (Cmd+K) med 18+ kommandoer, fuzzy-søk, teksthighlighting, piltast-nav; Breadcrumbs med 25+ segmentetiketter
- **#80** ✅ — Delbare profilkort: 9:16 Stories-format, RIASEC-gradient per type, Big Five progress-bars, Web Share API, kopier-lenke fallback
- **#81** ✅ — Empty states: generisk EmptyState-komponent, 9 forhåndsdefinerte states, animate-float emoji, primær+sekundær handlingsknapp
- **#82** ✅ — Microinteractions: toast-system (success/error/info/warning/loading), SuccessAnimation, AnimatedNumber, TiltCard, CardSkeleton/ListSkeleton, PulseButton

### Build-status
- TypeScript: ✅ 0 feil (`npx tsc --noEmit` passerer)
- Alle kjente build-feil fra tidligere auditer er rettet

## Repo og issues

- **Repo:** `andreas-t-hjertaker/suksess`
- **Firebase-prosjekt:** `suksess-842ed` (europe-west1)

### Finn issues

```bash
# Alle åpne issues
gh issue list --repo andreas-t-hjertaker/suksess --state open

# Alle issues (inkl. lukkede)
gh issue list --repo andreas-t-hjertaker/suksess --state all --limit 100

# Se ett spesifikt issue
gh issue view <nummer> --repo andreas-t-hjertaker/suksess

# Filtrer på labels
gh issue list --repo andreas-t-hjertaker/suksess --label "must-have"
gh issue list --repo andreas-t-hjertaker/suksess --label "fase-1"

# Søk i issues
gh issue list --repo andreas-t-hjertaker/suksess --state all --search "Weaviate"
```

## Tech stack

| Komponent | Teknologi |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | shadcn/ui v4, Tailwind CSS v4, Framer Motion |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions Gen 2) |
| Auth | Feide OIDC → Firebase Custom Tokens + Google + Email + Anonymous |
| AI | Firebase AI (Gemini 2.5 Flash, VertexAI backend) + Cloud Functions hybrid |
| ML | K-means++ clustering (frontend lib, Cloud Run planlagt) |
| Vektor-DB | Weaviate Cloud (europe-west1) |
| Betaling | Stripe (B2B skolelisenser, planlagt) |
| CI/CD | GitHub Actions (quality → test → staging → prod) |
| Region | europe-west1 (GDPR) |

## Mappestruktur med issue-referanser

```
suksess/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── admin/                     # Admin-dashboard (#16, #45, #54)
│   │   │   ├── brukere/page.tsx       # Brukeradministrasjon
│   │   │   ├── elever/page.tsx        # Elevsøk og -oversikt
│   │   │   ├── feature-flags/page.tsx # Feature flag admin
│   │   │   ├── radgivere/page.tsx     # Rådgiveradministrasjon (#54)
│   │   │   └── tenant/page.tsx        # Tenant/skole-config (#24, #37)
│   │   ├── api/chat/stream/route.ts   # SSE proxy for server-side LLM (#34 ⚠️)
│   │   ├── dashboard/
│   │   │   ├── abonnement/page.tsx    # Stripe-abonnement (#32 🔴)
│   │   │   ├── analyse/page.tsx       # Personlighetsanalyse (#5, #18)
│   │   │   ├── cv/page.tsx            # CV-builder (#14)
│   │   │   ├── dokumenter/page.tsx    # Dokumenter
│   │   │   ├── fremgang/page.tsx      # Fremgangsvisning (#20 gamification)
│   │   │   ├── innstillinger/page.tsx # Innstillinger
│   │   │   ├── jobbmatch/page.tsx     # Jobbmatch (#15, #48)
│   │   │   ├── karakterer/page.tsx    # Karakterregistrering (#10)
│   │   │   ├── karriere/page.tsx      # Karrierestier (#12)
│   │   │   ├── karrieregraf/page.tsx  # Branching karrieregraf (#12)
│   │   │   ├── mine-data/page.tsx     # GDPR dataeksport (#17, #38)
│   │   │   ├── profil/page.tsx        # Brukerprofil
│   │   │   ├── soknadscoach/page.tsx  # Søknadscoach (#19)
│   │   │   ├── studier/page.tsx       # Studieprogram (#52 ⚠️)
│   │   │   ├── utvikler/page.tsx      # Utviklerverktøy/API-nøkler
│   │   │   └── veileder/page.tsx      # Rådgiverpanel (#54)
│   │   ├── legal/                     # Juridisk (#51, #55)
│   │   │   ├── databehandleravtale/   # DPA-mal (#55)
│   │   │   ├── dpia/                  # DPIA (#51)
│   │   │   └── vilkar/               # Bruksvilkår
│   │   ├── login/page.tsx             # Innlogging (#2 Feide)
│   │   ├── onboarding/               # Onboarding (#4, #39)
│   │   │   ├── counselor/page.tsx     # Rådgiver-onboarding
│   │   │   └── foresatt-samtykke/     # GDPR samtykke <16 (#38)
│   │   ├── personvern/page.tsx        # Personvernerklæring (#17)
│   │   └── pricing/page.tsx           # Prisside (#32 🔴)
│   │
│   ├── components/
│   │   ├── app-check-provider.tsx     # Firebase App Check (#49)
│   │   ├── auth-provider.tsx          # Auth-kontekst (#2)
│   │   ├── consent-banner.tsx         # GDPR-samtykke (#38)
│   │   ├── feature-gate.tsx           # Feature flagging
│   │   ├── personality-provider.tsx   # Personlighetskontekst (#5)
│   │   ├── xp-progress.tsx            # Gamification XP (#20)
│   │   └── motion/                    # Framer Motion animasjoner (#5)
│   │
│   ├── hooks/
│   │   ├── use-auth.ts                # Auth-hook (#2)
│   │   ├── use-admin.ts               # Admin-tilgang (#16)
│   │   ├── use-feature-flags.ts       # Feature flags
│   │   ├── use-grades.ts              # Karakterer (#10)
│   │   ├── use-implicit-profiling.ts  # Implisitt profilering (#6)
│   │   ├── use-notifications.ts       # Varsler (#30)
│   │   ├── use-realtime-students.ts   # Realtime elevoversikt (#54)
│   │   ├── use-studiedata.ts          # Studiedata (#52 ⚠️)
│   │   ├── use-subscription.ts        # Stripe abonnement (#32 🔴)
│   │   ├── use-tenant.ts              # Multi-tenant (#24, #37)
│   │   └── use-xp.ts                  # Gamification (#20)
│   │
│   ├── lib/
│   │   ├── ai/                        # AI-tjenester
│   │   │   ├── cache.ts               # 3-lags caching (#9, #44)
│   │   │   ├── rag-pipeline.ts        # RAG-pipeline (#35 ⚠️ IKKE BRUKT)
│   │   │   └── semantic-cache.ts      # Semantisk cache (#44)
│   │   ├── clustering/kmeans.ts       # K-means++ (#13)
│   │   ├── firebase/
│   │   │   ├── ai.ts                  # Firebase AI + VertexAI (#50 ✅)
│   │   │   ├── app-check.ts           # App Check (#49)
│   │   │   ├── auth.ts                # Auth med Feide OIDC (#2)
│   │   │   ├── collections.ts         # Firestore collections (#3, #37)
│   │   │   └── config.ts              # Firebase-config (suksess-842ed)
│   │   ├── gamification/xp.ts         # XP-system (#20)
│   │   ├── gdpr/minor-consent.ts      # Samtykke mindreårige (#38)
│   │   ├── grades/calculator.ts       # Poengberegning (#10, #19)
│   │   ├── i18n/locales.ts            # Bokmål/nynorsk/samisk (#29, #42)
│   │   ├── karriere/data.ts           # 70+ karrierenoder (#12)
│   │   ├── observability/logger.ts    # Strukturert logging (#25)
│   │   ├── personality/               # Personlighetsprofil
│   │   │   ├── engine.ts              # Adaptiv UI-motor (#5)
│   │   │   ├── implicit-tracker.ts    # Implisitt profilering (#6)
│   │   │   ├── questions.ts           # Big Five/RIASEC spørsmål (#4)
│   │   │   └── scoring.ts             # Profilskåring (#4)
│   │   ├── risk/dropout-risk.ts       # Frafallsrisikomodell (#23)
│   │   ├── stripe/                    # Stripe (#32 🔴)
│   │   │   ├── config.ts
│   │   │   └── pricing.ts
│   │   ├── studiedata/                # utdanning.no klient (#52 ⚠️)
│   │   ├── vgs/programfag.ts          # VGS programfag (#10)
│   │   └── weaviate/client.ts         # Weaviate-klient (#8 ⚠️)
│   │
│   ├── modules/
│   │   └── ai-assistant/              # AI-veileder chatmodul
│   │       ├── components/            # Chat UI (#7)
│   │       ├── hooks/use-chat.ts      # Chat-hook (#7, #47 ⚠️)
│   │       ├── lib/
│   │       │   ├── context.ts         # Brukerkontekst
│   │       │   ├── conversation-store.ts # Persistens (#47 ⚠️ BUILD ERROR)
│   │       │   └── system-prompt.ts   # Karriereveileder-prompt (#53)
│   │       └── types.ts              # Chat-typer
│   │
│   └── types/
│       ├── domain.ts                  # Alle domenetyper
│       └── index.ts
│
├── functions/                         # Firebase Cloud Functions Gen 2
│   └── src/
│       ├── index.ts                   # Hoved-router + Stripe + admin (#36)
│       ├── llm.ts                     # Server-side LLM (#34 ⚠️ bruker Google AI global)
│       ├── feide-claims.ts            # Feide OIDC claims (#2)
│       ├── middleware.ts              # Auth/admin/tenant/rate-limit (#36)
│       ├── middleware.test.ts         # Tester (#43)
│       ├── admin-stats.ts            # Aggregerte statistikker (#45)
│       ├── weaviate-index.ts         # Weaviate-indeksering (#8 ⚠️)
│       └── ingest/                   # Data-ingest (#11 ⚠️)
│           ├── index.ts              # Koordinator + SSB + manuell trigger
│           ├── utdanning-no.ts       # ⚠️ STUB — ikke ekte API
│           ├── dbh.ts                # DBH opptaksstatistikk ✅
│           ├── nav-arbeidsplassen.ts  # NAV jobbmarked ✅
│           └── nav-stillinger.ts     # NAV pam-stilling-feed ✅
│
├── .github/workflows/                # CI/CD (#46)
│   ├── ci-cd.yml                     # Quality + test pipeline
│   └── firebase-deploy.yml           # Firebase deploy
├── firestore.rules                   # 361 linjer, multi-tenant (#37)
├── firestore.indexes.json            # Compound indexes
├── e2e/                              # Playwright E2E-tester (#28, #43)
└── CLAUDE.md                         # Denne filen
```

**Tegnforklaring:** ✅ = ferdig, ⚠️ = ufullstendig (se issue-kommentar), 🔴 = ikke startet

## Avhengigheter mellom åpne issues

```
FASE 1 — KRITISK (GDPR/lovkrav):
  #64 (VertexAI SDK) ──→ fikser #34 GDPR-brudd
  #57 (AI Safety)    ──→ lovkrav + mindreårige
  #67 (WCAG 2.2 AA)  ──→ lovkrav for edtech B2B-salg

FASE 2 — KJERNEFUNKSJONALITET:
  #65 (søkeproxy) ──→ fikser #8 ──→ #35 (RAG) ──→ fungerende AI-veileder
  #58 (utdanning.no API) ──→ fikser #11 ──→ #52 (studiedata-kobling)
  #60 (Samordna Opptak) ──→ reelle poenggrenser
  #47 (Chat type-feil) ──→ #63 (Samtalehistorikk-UI)
  #69 (Onboarding RIASEC/Big Five) ──→ kjerneverdi for plattformen
  #68 (Rådgiverdashbord) ──→ Skole-plan revenue

  UX-ISSUES (FASE 2):
  #74 (Design System) ──→ grunnlag for alle UX-issues
  #73 (Landingsside) ──→ konvertering + førsteinntrykk
  #75 (Onboarding UX) ──→ avhenger av #69 + #74
  #76 (AI Chat UX) ──→ avhenger av #47/#63 + #74
  #77 (Dashboard) ──→ avhenger av #74
  #78 (Mobil UX) ──→ avhenger av #74
  #79 (Navigasjon) ──→ avhenger av #74 + #78
  #81 (Empty States) ──→ avhenger av #74 + #75
  #82 (Microinteractions) ──→ avhenger av #74 + #78

FASE 3 — AVANSERT:
  #70 (Gamification) ← avhenger av #69
  #71 (Arbeidsgiverportal) ← avhenger av #69 + #68 RBAC
  #72 (Mentoring) ← avhenger av #69 + #71
  #80 (Delbare profilkort) ← avhenger av #69 + #74
  #32 (Stripe) ← uavhengig
  #62 (Yrkesfagdata) ← uavhengig
  #59 (PWA) ← uavhengig
  #66 (E2E tester) ← koordineres med #67
```

**Anbefalt rekkefølge:** #64 → #57 → #67 → #74 → #65 → #58 → #69 → #73 → #75 → #35 → #76 → #77 → #78 → #79 → #81 → #82 → #68 → #47/#63 → #52/#60 → #70 → #80 → #32 → #71 → #72

## Konvensjoner

- **Språk:** Norsk (bokmål) i all UI, issues og dokumentasjon.
- **GDPR:** VertexAI (europe-west1), App Check, DPIA, DPA-mal.
- **Branch-strategi:** Feature branches → PR → merge til main.
- **shadcn/ui v4:** `className`, IKKE `asChild`.
- **Cloud Functions:** Gen 2 med `onRequest` og stibasert ruting.
- **Testing:** Vitest (unit), Playwright (E2E).

## Research-filer

Detaljerte tekniske guider i `/research/`-mappen:

### Teknisk research (tidlig)
- `feide-oidc.md` — Feide OIDC-flyt, claims mapping, Firebase Custom Token
- `data-ingest.md` — utdanning.no, DBH, NAV, SSB, Samordna opptak
- `weaviate-kmeans.md` — Weaviate Cloud, NorSBERT4, hybrid search, k-means
- `observability-stripe.md` — Logging/metrics, EHF/Peppol-krav, MVA
- `firebase-ai-architecture.md` — Hybridarkitektur, VertexAI vs GoogleAI
- `nav-stillinger-api.md` — pam-stilling-feed, autentisering, STYRK→RIASEC
- `gdpr-minors-norway.md` — Aldersgrense, samtykke, DPIA, Datatilsynet

### Kodeaudit-rapporter (mars 2026)
- `utdanning-data-sources.md` — Verifiserte API-er: `api.utdanning.no/studievelgeren/result` (1395 programmer), Grep/Udir 6588 fagkoder
- `pwa-mobile-strategy.md` — Serwist anbefalt, 97% smarttelefon-dekning
- `education-finance-data.md` — Lånekassen har ingen API, old.api.utdanning.no 118 endepunkter
- `ai-safety-guardrails.md` — Gemini safety OFF som standard, EU AI Act aug 2026

### Strategisk research (mars 2026)
- `universell-utforming.md` — WCAG 2.2 AA, IKT-forskriften, UUtilsynet, EAA
- `laeringsanalyse-skoler.md` — Rådgiverdashbord, RBAC, trafikklys-modell, GDPR
- `onboarding-personlighetstest.md` — BFI-20, RIASEC UX, progressiv profiling, adaptiv UI
- `gamification-motivasjon.md` — SDT, Octalysis, badges/XP/streaks, etikk
- `arbeidsgiver-mentoring.md` — Handshake-modell, Ungdomsløftet, RIASEC-matching, revenue

### UX-research (mars 2026)
- `edtech-ux-patterns.md` — Duolingo, Khan Academy, Brilliant, Headspace, Notion, norske verktøy (35KB)
- `gen-z-ux-trends.md` — Gen Z design, personalityzation, onboarding, dashboard, chat UX (50KB)
- `../ux-audit-kodebase.md` — Full UX-audit av eksisterende kode: 26+ sider, 40 komponenter, 4.2/5 kvalitet
