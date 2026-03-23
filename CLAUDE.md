# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Status (mars 2026)

**55 issues totalt — 54 lukket, 1 åpent (#32 Stripe).**

Alle kjernemoduler er implementert. Frontend, backend, Cloud Functions, data-ingest, AI-hybridarkitektur, GDPR, CI/CD og juridisk dokumentasjon er på plass.

### Gjenværende arbeid
- **#32 Stripe** — Prisplaner definert, men trenger ekte Stripe Price IDs og EHF/Peppol-integrasjon for offentlig sektor.

### Kjente build-feil (2 stk)
- `next.config.ts(12)`: `eslint` property finnes ikke i NextConfig
- `conversation-store.ts(58)`: `sources` finnes ikke på ChatMessage type

## Repo og issues

- **Repo:** `andreas-t-hjertaker/suksess`
- **Firebase-prosjekt:** `suksess-842ed` (europe-west1)

### Nyttige kommandoer

```bash
gh issue list --repo andreas-t-hjertaker/suksess --state open
gh issue list --repo andreas-t-hjertaker/suksess --state all
gh issue view 32 --repo andreas-t-hjertaker/suksess
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

## Mappestruktur

```
suksess/
├── src/
│   ├── app/                    # Next.js App Router (32 sider)
│   │   ├── admin/              # Admin: brukere, rådgivere, elever, tenant, flags
│   │   ├── api/chat/stream/    # SSE proxy for server-side LLM
│   │   ├── dashboard/          # 14 dashboard-sider
│   │   ├── legal/              # DPA, DPIA, vilkår
│   │   ├── login/
│   │   ├── onboarding/         # Rådgiver + foresatt-samtykke
│   │   ├── personvern/
│   │   └── pricing/
│   ├── components/             # UI-komponenter + app-check, focus-trap, live-region
│   ├── hooks/                  # 15 hooks inkl. realtime students/stats, studiedata
│   ├── lib/
│   │   ├── a11y/               # WCAG utilities
│   │   ├── ai/                 # Cache, RAG-pipeline, semantisk cache
│   │   ├── clustering/         # K-means++
│   │   ├── firebase/           # Config, auth (Feide), App Check, collections
│   │   ├── gamification/       # XP-system
│   │   ├── gdpr/               # Samtykke for mindreårige
│   │   ├── grades/             # Karakterberegning
│   │   ├── i18n/               # Bokmål, nynorsk, samisk
│   │   ├── karriere/           # Karrieredata (70+ noder)
│   │   ├── observability/      # Strukturert logging, LLM-metrics
│   │   ├── personality/        # Big Five/RIASEC scoring + implisitt profilering
│   │   ├── risk/               # Frafallsrisiko-modell
│   │   ├── stripe/             # Stripe-konfig
│   │   ├── studiedata/         # utdanning.no klient
│   │   ├── vgs/                # Programfag
│   │   └── weaviate/           # Weaviate-klient
│   ├── modules/
│   │   └── ai-assistant/       # Chat med persistens, karriereveileder-prompt
│   └── types/
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       ├── admin-stats.ts      # Aggregerte skolestatistikker
│       ├── feide-claims.ts     # Feide OIDC claims handler
│       ├── index.ts            # Router + Stripe + admin
│       ├── ingest/             # Data-ingest (utdanning.no, DBH, NAV)
│       ├── llm.ts              # Server-side LLM med RAG
│       ├── middleware.ts       # withAuth, withAdmin, withTenant, rateLimit
│       ├── middleware.test.ts  # Unit tests
│       └── weaviate-index.ts   # Weaviate-indeksering
├── .github/workflows/          # CI/CD (ci-cd.yml + firebase-deploy.yml)
├── firestore.rules             # 361 linjer, multi-tenant, rollebasert
└── firestore.indexes.json      # Compound indexes
```

## Konvensjoner

- **Språk:** Norsk (bokmål) i all UI, issues og dokumentasjon.
- **GDPR:** VertexAI (europe-west1), App Check, DPIA, DPA-mal.
- **Branch-strategi:** Feature branches → PR → merge til main.
- **shadcn/ui v4:** `className`, IKKE `asChild`.
