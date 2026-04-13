# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Status (13. april 2026)

**v1.2.0 tagget.** 215 issues opprettet — 208 lukket, 7 åpne i GitHub (1 enhancement + 6 bugs under review). Deploy til produksjon live på [karriere.ketl.cloud](https://karriere.ketl.cloud). Full CI/CD-pipeline. Brukertesting gjennomført 10. og 12. april — 6 nye bugs identifisert og fikset 13. april.

3 kodeauditer, 5 strategisk research, 3 UX-research, 1 B2B-research, 1 kodeaudit+sikkerhet-research, 2 brukertestinger gjennomført.

### Åpne issues i GitHub (7 stk — 6 fikset, venter merge)

- **#199** — Enhancement: E2E-test for feedback-loop (nice-to-have)
- **#210** — Bug: «Første steg» achievement ulåst → fikset i `claude/tender-faraday-WKztM`
- **#211** — Bug: Ingen toast etter feedback → fikset
- **#212** — Bug: Falsk RIASEC «IRS» fallback → fikset
- **#213** — Bug: /onboarding viser landingsside → fikset
- **#214** — Bug: FloatingQuestion blokkerer sidebar + gjenoppstår → fikset
- **#215** — Bug: XP oppdateres ikke etter karakter → fikset

### Nylig lukket (10. april 2026)
- **#195** — Refaktorering: console.* → Firebase logger i Cloud Functions ✅
- **#196** — Admin-dashboard: avgGradeAverage og topCareerPaths implementert ✅
- **#197** — Bug: Onboarding overflow ved valg av spørsmål ✅
- **#198** — Bug: dashboard/utvikler feilmelding ✅
- **#200–#203** — Dependabot: actions/upload-artifact, google-github-actions/auth+setup-gcloud, zaproxy/action-baseline ✅
- **#204** — UX: Re-entry vei til onboarding for innloggede brukere ✅
- **#205** — UX: XP-krav og tips på låste funksjonssider ✅
- CI: ZAP auto-issue creation deaktivert (403 permission fix)
- Stale branches ryddet: fix/open-issues-batch-april-10, claude/tender-faraday-HpkT2

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
│       ├── handlers/                  # 10 domenebaserte handler-moduler ✅
│       │   └── nvb-import.ts          # NVB karakterimport (#147) ✅
│       ├── ingest/fint.ts             # FINT-integrasjon (#142) ✅
│       ├── router.ts                  # Stibasert ruting ✅
│       └── constants.ts              # Delte konstanter ✅
│
├── .github/workflows/                 # CI/CD ✅
├── firestore.rules                    # Multi-tenant sikkerhet ✅
├── e2e/                               # Playwright E2E-tester ✅
└── CLAUDE.md                          # Denne filen
```

## Gjenværende arbeid (7 åpne issues)

208 av 215 issues lukket. 6 bugs fikset i `claude/tender-faraday-WKztM` (venter merge). #199 (E2E feedback-loop test, nice-to-have) gjenstår.

### Anbefalt neste steg

**Ops-oppgaver:**
1. Aktiver Secret Manager API i GCP Console for suksess-842ed
2. Konfigurer FINT OAuth2-credentials i Cloud Functions secrets
3. Konfigurer NVB API-tilgang via HK-dir

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

