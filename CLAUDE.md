# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Repo og issues

- **Repo:** `andreas-t-hjertaker/suksess`
- **Issues:** Alle issues ligger i dette repoet. Bruk `gh issue list --repo andreas-t-hjertaker/suksess` for å hente dem.
- **Per mars 2026:** 46 issues totalt, 24 lukket (frontend/UI ferdig), 21 åpne (backend, infrastruktur, nye gaps), 1 delvis.
- Issues har labels: `fase-1` til `fase-5`, `must-have`/`should-have`/`nice-to-have`, `frontend`/`backend`/`ai`/`ml`/`devops`/`infrastruktur`/`data`/`integrasjon`/`admin`/`betaling`/`auth`/`critical`/`blocker`/`setup`.

### Nyttige kommandoer

```bash
# Alle åpne issues
gh issue list --repo andreas-t-hjertaker/suksess --state open

# Åpne issues for en bestemt fase
gh issue list --repo andreas-t-hjertaker/suksess --state open --label fase-1

# Se detaljer for en issue
gh issue view 34 --repo andreas-t-hjertaker/suksess

# Lukke en issue
gh issue close 34 --repo andreas-t-hjertaker/suksess

# Opprette ny issue
gh issue create --repo andreas-t-hjertaker/suksess --title "Tittel" --body "Beskrivelse" --label "fase-2" --label "backend"
```

### Åpne issues (mars 2026)

**Fase 1 — Prosjektoppsett og fundament:**
- #1 Prosjektoppsett: Next.js 16 + Firebase + TypeScript (delvis ferdig)
- #2 Feide OIDC-integrasjon for skoleinnlogging (blocker)
- #36 Cloud Functions infrastruktur og shared middleware
- #37 Multi-tenant Firestore datamodell og security rules
- #38 GDPR og samtykke: Personvern for mindreårige
- #46 CI/CD Pipeline: GitHub Actions → Firebase deploy med staging

**Fase 2 — Kjernefunksjonalitet:**
- #8 Weaviate vektordatabase-oppsett for semantisk søk
- #11 Data-ingest: utdanning.no, DBH, Samordna opptak, NAV, SSB
- #34 LLM Backend: Cloud Functions for AI-chat og innholdsgenerering
- #35 RAG Pipeline: Kontekstuell AI med Weaviate-henting
- #39 Onboarding-flyt for elever, rådgivere og admin
- #40 Sanntid og streaming: Chat SSE, varsler og Firestore listeners

**Fase 3 — Avansert funksjonalitet:**
- #13 K-means clustering: Klynge-personaer og kollaborativ filtering
- #25 Observability: Logging, metrics og kostnadsovervåking
- #32 Stripe abonnementsmodell for skoler (EHF/Peppol obligatorisk)
- #41 Universell utforming (WCAG 2.1 AA)
- #43 Testing: Unit, integration og E2E for backend
- #44 Caching-lag: Semantisk og API-respons caching
- #45 Admin Dashboard Backend: Aggregerte statistikker og rapporter

**Fase 4:**
- #23 Frafallsrisiko-modell
- #42 Språkstøtte: Bokmål, nynorsk og samisk

### Lukkede issues (kun frontend/UI — backend mangler for de fleste)

#3, #4, #5, #6, #7, #9, #10, #12, #14, #15, #16, #17, #18, #19, #20, #21, #22, #24, #26, #27, #28, #29, #30, #31

> **NB:** Lukkede issues betyr at UI/frontend er implementert. De fleste trenger fortsatt backend-kobling. Sjekk issue-beskrivelsen for detaljer.

## Tech stack

| Komponent | Teknologi |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | shadcn/ui v4, Tailwind CSS v4, Framer Motion |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions Gen 2) |
| Auth | Feide OIDC → Firebase Custom Tokens (planlagt) |
| AI | LLM (OpenAI/Anthropic), Weaviate (vektordatabase), RAG |
| ML | K-means clustering (Cloud Run, Python) |
| Betaling | Stripe (B2B skolelisenser) + EHF/Peppol for offentlig sektor |
| CI/CD | GitHub Actions → Firebase deploy |
| Region | europe-west1 (GDPR) |

## Mappestruktur

```
suksess/
├── src/
│   ├── app/                    # Next.js App Router sider
│   │   ├── admin/              # Admin-dashboard (brukere, rådgivere, tenant, feature-flags)
│   │   ├── dashboard/          # Hoveddashboard
│   │   │   ├── abonnement/     # Stripe-abonnement
│   │   │   ├── analyse/        # Analysesider
│   │   │   ├── cv/             # CV-builder
│   │   │   ├── jobbmatch/      # Jobbmatch
│   │   │   ├── karakterer/     # Karakterregistrering
│   │   │   ├── karriere/       # Karriereutforsker
│   │   │   ├── karrieregraf/   # Branching karrieregraf
│   │   │   ├── mine-data/      # GDPR datainnsyn
│   │   │   ├── profil/         # Personlighetsprofil
│   │   │   ├── studier/        # Studieutforsker
│   │   │   ├── veileder/       # AI-veileder chat
│   │   │   └── ...
│   │   ├── login/
│   │   ├── personvern/
│   │   └── pricing/
│   ├── components/
│   │   ├── motion/             # Framer Motion animasjoner
│   │   └── ui/                 # shadcn/ui komponenter
│   ├── hooks/
│   ├── lib/
│   │   ├── ai/                 # AI-hjelpefunksjoner
│   │   ├── firebase/           # Firebase-konfigurasjon
│   │   ├── gamification/       # Gamification-logikk
│   │   ├── grades/             # Karakterberegning
│   │   ├── i18n/               # Internasjonalisering
│   │   ├── karriere/           # Karrieredata
│   │   ├── personality/        # Big Five/RIASEC-logikk
│   │   └── stripe/             # Stripe-integrasjon
│   ├── modules/
│   │   └── ai-assistant/       # AI-assistent modul
│   └── types/
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       ├── index.ts            # Function exports
│       └── middleware.ts       # Shared middleware
├── e2e/                        # Playwright E2E-tester
├── public/
├── .github/workflows/          # GitHub Actions
├── .firebaserc                 # Firebase-prosjekt (NB: peker fortsatt til "ketlcloud")
├── firebase.json
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Firebase-konfigurasjon

- `.firebaserc` peker per nå til `ketlcloud` — dette skal endres til nytt prosjekt-ID.
- Region: `europe-west1` (Belgia) — GDPR-krav.
- Ingen GitHub Secrets konfigurert for CI/CD ennå.

## Viktige avhengigheter mellom issues

```
#36 (Cloud Functions infra) ← blokkerer → #34 (LLM), #35 (RAG), #11 (data-ingest)
#2 (Feide OIDC) ← blokkerer → #37 (multi-tenant), #38 (GDPR)
#8 (Weaviate) ← blokkerer → #35 (RAG pipeline)
#11 (data-ingest) ← blokkerer → #35 (RAG), #23 (frafallsrisiko)
#34 (LLM backend) ← blokkerer → #40 (streaming), #44 (caching)
```

## Research-dokumentasjon

Detaljert research finnes i repo-eierens workspace:
- Feide OIDC: Teknisk flyt, claims mapping, DPIA-krav, tidslinje
- Data-ingest: 7 norske API-kilder med endepunkter, auth, eksempelkall
- Weaviate + K-means: Cloud Flex $45/mnd, NorSBERT4, hybrid search, k=6-8
- Observability + Stripe: Cloud Logging + Grafana + Sentry, EHF/Peppol obligatorisk

Hvert åpent issue inneholder research-sammendrag med tekniske detaljer, API-endepunkter og kodeeksempler.

## Konvensjoner

- **Språk:** Norsk (bokmål) i all UI, issues og dokumentasjon.
- **Issues:** Detaljerte beskrivelser med akseptansekriterier, tasks som checkboxes, og labels.
- **Branch-strategi:** Feature branches → PR → merge til main.
- **Frontend-rammeverk:** shadcn/ui v4 (bruker `className`, IKKE `asChild` for knapper med lenker — bruk `<Link>` wrappet med `<Button>` via className-overføring).
