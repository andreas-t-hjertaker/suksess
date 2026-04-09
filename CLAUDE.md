# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Status (9. april 2026)

**194 issues opprettet — ~190 lukket, 4+7 åpne i GitHub.** Deploy til produksjon live. Brukertesting gjennomført 9. april — 7 bugs/UX-forbedringer identifisert og fikset samme dag.

3 kodeauditer, 5 strategisk research, 3 UX-research, 1 B2B-research, 1 kodeaudit+sikkerhet-research, 1 brukertesting gjennomført.

### Åpne issues i GitHub

#### SHOULD-HAVE (2 stk)
- **#180** — Testing: hooks-tester lagt til — DELVIS (Firebase auth/Firestore-tester mangler)
- **#150** — Sikkerhetstesting: OWASP-scanning — IKKE STARTET

#### BACKEND/DATA (1 stk)
- **#142** — FINT-integrasjon — IKKE STARTET

#### NICE-TO-HAVE (1 stk)
- **#147** — Nasjonal vitnemålsdatabase (NVB) — IKKE STARTET

#### BRUKERTESTING-BUGS (7 stk — alle fikset 9. april, issues åpne)
- **#188** — Forsiden: Blank seksjon etter hero (ScrollReveal margin justert) ✅
- **#189** — Karrieregraf: Svart root-sirkel (stroke + RIASEC-kode lagt til) ✅
- **#190** — Handlingsplan: Rå Firebase-feil → «Låst funksjon»-side ✅
- **#191** — Karakterer/Fremgang: Opacity-bug (PageTransition varighet redusert) ✅
- **#192** — Route guard: Race condition ved direkte URL (checkedPath-tracking) ✅
- **#193** — Dashboard: Hengelås-indikator på låste widgets ✅
- **#194** — Mine data: Loading-skeleton lagt til ✅

### Nylig lukket (8.–9. april 2026)
- **#187** — CI/CD: Deploy fikset (continue-on-error + defineSecret-fjerning) ✅
- **#181** — TypeScript: Strengere tsconfig — strict: true ✅
- **#174** — Tilgjengelighet: Label-input-kobling fikset i 6 sider ✅
- **#170** — UX: Error states i alle 24 dashboard-sider ✅
- **#169** — Refaktorering: Komponent-ekstraksjon fra store sider ✅
- 7 Dependabot-PRer merget

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

## Gjenværende arbeid (4 åpne issues)

```
DELVIS FERDIG:
  #180 (Tester) — mangler Firebase auth/Firestore-tester

IKKE STARTET:
  #150 (OWASP-scanning)
  #142 (FINT-integrasjon)
  #147 (NVB karakterimport)
```

### Anbefalt neste steg

**Denne uken:**
1. Fullfør #180 — Firebase auth/Firestore-tester med emulator
2. Start #150 — npm audit allerede i CI, legg til OWASP ZAP-scanning
3. Aktiver Secret Manager API i GCP Console for suksess-842ed (permanent fiks for secrets-synkronisering)

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

