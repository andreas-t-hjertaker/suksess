# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Status (7. april 2026)

**181 issues opprettet — ~163 lukket, 18 åpne i GitHub.** Deploy til produksjon 25. mars 2026 (Firebase Hosting + Cloud Functions).

3 kodeauditer, 5 strategisk research, 3 UX-research, 1 B2B-research, 1 kodeaudit+sikkerhet-research gjennomført.

### Åpne issues i GitHub (18 stk)

**10 av disse er ferdig implementert i kode og bør lukkes.** Se "Klar for lukking" nedenfor.

#### MUST-HAVE (3 stk — alle ferdig implementert)
- **#179** — CI/CD: E2E-tester + npm audit ✅ KLAR FOR LUKKING
- **#167** — Sikkerhet: Peppol-hemmeligheter fjernet fra klient ✅ KLAR FOR LUKKING
- **#166** — Refaktorering: functions/src/index.ts splittet (91 linjer, 9 handler-moduler) ✅ KLAR FOR LUKKING

#### SHOULD-HAVE (11 stk)
- **#181** — TypeScript: Strengere tsconfig — DELVIS (noImplicitAny mangler)
- **#180** — Testing: hooks-tester lagt til — DELVIS (Firebase auth/Firestore-tester mangler)
- **#178** — GDPR: E-postlogger anonymisert ✅ KLAR FOR LUKKING
- **#177** — Compliance: Firestore TTL for AI Act-logger ✅ KLAR FOR LUKKING
- **#176** — Bug: Input-validering i personality/scoring ✅ KLAR FOR LUKKING
- **#174** — Tilgjengelighet: Label-input-kobling — DELVIS (3 sider fikset)
- **#170** — UX: Error states — DELVIS (7 av ~15 sider har ErrorState)
- **#169** — Refaktorering: Ekstraher komponenter — DELVIS (3 sider > 600 linjer gjenstår)
- **#168** — Observabilitet: Tomme catch-blokker erstattet ✅ KLAR FOR LUKKING
- **#150** — Sikkerhetstesting: OWASP-scanning — IKKE STARTET
- **#142** — FINT-integrasjon — IKKE STARTET

#### NICE-TO-HAVE (4 stk)
- **#175** — Refaktorering: Konsistent timestamp-håndtering ✅ KLAR FOR LUKKING
- **#173** — Refaktorering: Felles TTL/cache-logikk ✅ KLAR FOR LUKKING
- **#172** — Refaktorering: Felles STYRK-RIASEC mapping ✅ KLAR FOR LUKKING
- **#147** — Nasjonal vitnemålsdatabase (NVB) — IKKE STARTET

### Issues klar for lukking (10 stk)
#166, #167, #168, #172, #173, #175, #176, #177, #178, #179

### Stale PRs som bør lukkes (3 stk)
- **PR #186** — Alle endringer allerede på main (15 issues)
- **PR #185** — #179-fiksen allerede på main
- **PR #184** — #167 superseded av sterkere fiks på main

### Nylig lukkede issues (utvalg)
- **#128** — Ekte karrieredata: koblet til Firestore ✅
- **#130** — AI-generert karrierehandlingsplan ✅
- **#131** — Nynorsk-støtte ✅
- **#132** — AI Intervjutrener ✅
- **#139** — Klient-side rutebeskyttelse ✅
- **#140** — Loading states og feilhåndtering ✅
- **#141** — AI Chat-sikkerhet for mindreårige ✅
- **#145** — Server-side rate limiting ✅
- **#146** — Tilgjengelighet (ARIA + tastatur) ✅
- **#148** — Dark mode tema-velger ✅
- **#149** — Zod env-validering ✅
- **#112** — Fjern hardkodede Firebase-credentials ✅
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
│   │   │   ├── karriere/page.tsx      # Karrierestier (#128 — Firestore-koblet) ✅
│   │   │   ├── karrieregraf/page.tsx  # Karrieregraf (#128 — Firestore-koblet) ✅
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
│   │   ├── career-card.tsx            # Gjenbrukbar karrierekort (#169) ✅
│   │   ├── consent-banner.tsx         # GDPR-samtykke ✅
│   │   ├── cv-preview.tsx             # CV-forhåndsvisning (#169) ✅
│   │   ├── error-boundary.tsx         # Error Boundary ✅
│   │   ├── html-lang-sync.tsx         # Nynorsk/bokmål lang-attributt (#131) ✅
│   │   ├── json-ld.tsx                # Structured data (#99) ✅
│   │   ├── personality-provider.tsx   # Personlighetskontekst ✅
│   │   ├── route-guard.tsx            # Klient-side rutebeskyttelse (#139) ✅
│   │   ├── stat-card.tsx              # Gjenbrukbar statistikkort (#169) ✅
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
│   │   ├── i18n/locales.ts            # Bokmål + nynorsk (#131) ✅
│   │   ├── karriere/data.ts           # 70+ karrierenoder (#128 — Firestore-koblet) ✅
│   │   ├── mappings/styrk-riasec.ts   # Felles STYRK-RIASEC mapping (#172) ✅
│   │   ├── utils/time.ts              # Felles timestamp-utils (#175) ✅
│   │   ├── utils/ttl.ts               # Felles TTL/cache-utils (#173) ✅
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
│   └── src/
│       ├── index.ts                   # Entry point (91 linjer, #166) ✅
│       ├── handlers/                  # 9 domenebaserte handler-moduler ✅
│       ├── router.ts                  # Stibasert ruting ✅
│       └── constants.ts              # Delte konstanter ✅
│
├── .github/workflows/                 # CI/CD ✅
├── firestore.rules                    # Multi-tenant sikkerhet ✅
├── e2e/                               # Playwright E2E-tester ✅
└── CLAUDE.md                          # Denne filen
```

## Gjenværende arbeid (8 reelle åpne issues)

Etter lukking av 10 ferdig-implementerte issues gjenstår:

```
DELVIS FERDIG (trenger mer arbeid):
  #181 (Strengere TypeScript) — mangler noImplicitAny
  #180 (Tester) — mangler Firebase auth/Firestore-tester
  #174 (Tilgjengelighet) — 3 sider fikset, flere gjenstår
  #170 (Error states) — 7 av ~15 sider har ErrorState
  #169 (Komponent-ekstraksjon) — 3 sider > 600 linjer gjenstår (foresatt 712, innstillinger 688, karriere 633)

IKKE STARTET:
  #150 (OWASP-scanning)
  #142 (FINT-integrasjon)
  #147 (NVB karakterimport)
```

### Anbefalt neste steg

**Umiddelbart (april 2026):**
1. Lukk 10 ferdige issues + 3 stale PRs i GitHub
2. Fullfør #170 (error states i resterende dashboard-sider)
3. Fullfør #169 (ekstraher komponenter fra 3 gjenværende store sider)
4. Fullfør #174 (a11y i alle dashboard-sider)

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
