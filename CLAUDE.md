# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Status (mars 2026)

**54 issues totalt — 47 lukket, 7 åpne (6 gjenåpnet etter kodeaudit, 1 ny).**

PR #56 (64 commits, 110 filer, 8857 linjer) implementerte store deler av plattformen. Etter grundig kodegjennomgang ble 6 issues gjenåpnet fordi implementasjonen var ufullstendig.

### Gjenåpnede issues (halvveis/ufullstendig)
- **#34** — LLM Backend bruker Google AI Studio (global), ikke VertexAI europe-west1 server-side
- **#8** — Weaviate mangler søkeproxy i backend, bruker OpenAI embedding istedenfor NorSBERT4
- **#35** — RAG Pipeline er skrevet men aldri importert/brukt i chatten
- **#47** — Chat-persistens har type-feil og mangler UI for samtalehistorikk
- **#11** — utdanning.no ingest er stub/mock, Samordna Opptak mangler
- **#52** — Studiedata-kobling kaller stub-API

### Fortsatt åpen
- **#32** — Stripe: trenger ekte Price IDs, EHF/Peppol

### Kjente build-feil (2 stk)
- `next.config.ts(12)`: `eslint` property finnes ikke i NextConfig
- `conversation-store.ts(58)`: `sources` finnes ikke på ChatMessage type

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
#34 (VertexAI server)  ──────────────────┐
                                          │
#8 (Weaviate søkeproxy) ────┐             │
                             ├── #35 (RAG integrering i chat)
#11 (utdanning.no data) ────┘             │
                                          │
#47 (Chat-persistens UI) ← uavhengig     │
#52 (Studiedata-kobling) ← avhenger av #11
#32 (Stripe) ← uavhengig
```

**Anbefalt rekkefølge:** #34 → #8 → #11 → #35 → #52 → #47 → #32

## Konvensjoner

- **Språk:** Norsk (bokmål) i all UI, issues og dokumentasjon.
- **GDPR:** VertexAI (europe-west1), App Check, DPIA, DPA-mal.
- **Branch-strategi:** Feature branches → PR → merge til main.
- **shadcn/ui v4:** `className`, IKKE `asChild`.
- **Cloud Functions:** Gen 2 med `onRequest` og stibasert ruting.
- **Testing:** Vitest (unit), Playwright (E2E).

## Research-filer

Detaljerte tekniske guider i `/research/`-mappen:
- `feide-oidc.md` — Feide OIDC-flyt, claims mapping, Firebase Custom Token
- `data-ingest.md` — utdanning.no, DBH, NAV, SSB, Samordna opptak
- `weaviate-kmeans.md` — Weaviate Cloud, NorSBERT4, hybrid search, k-means
- `observability-stripe.md` — Logging/metrics, EHF/Peppol-krav, MVA
- `firebase-ai-architecture.md` — Hybridarkitektur, VertexAI vs GoogleAI
- `nav-stillinger-api.md` — pam-stilling-feed, autentisering, STYRK→RIASEC
- `gdpr-minors-norway.md` — Aldersgrense, samtykke, DPIA, Datatilsynet
