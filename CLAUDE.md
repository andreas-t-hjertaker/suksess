# CLAUDE.md — Suksess

## Prosjekt

Suksess er en AI-drevet karriereveiledningsplattform for norske VGS-elever. Livsløpsplattform fra VGS til jobb med personlighetsprofil (Big Five/RIASEC), adaptiv UI, AI-veileder, karrierestiutforsker, CV-builder og jobbmatch.

**Eier:** KETL (andreas-t-hjertaker)

## Repo og issues

- **Repo:** `andreas-t-hjertaker/suksess`
- **Issues:** Alle issues ligger i dette repoet. Bruk `gh issue list --repo andreas-t-hjertaker/suksess` for å hente dem.
- **Per mars 2026:** 55 issues totalt, 25 lukket (frontend/UI ferdig), 30 åpne (backend, infrastruktur, gaps).
- Issues har labels: `fase-1` til `fase-5`, `must-have`/`should-have`/`nice-to-have`, `frontend`/`backend`/`ai`/`ml`/`devops`/`infrastruktur`/`data`/`integrasjon`/`admin`/`betaling`/`auth`/`critical`/`blocker`/`setup`/`compliance`/`security`.

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

**Fase 1 — Prosjektoppsett og fundament (KRITISK):**
- #1 Prosjektoppsett: Rebranding fra ketlcloud → Suksess (delvis ferdig, 18+ filer gjenstår)
- #2 Feide OIDC-integrasjon for skoleinnlogging (blocker)
- #36 Cloud Functions infrastruktur og shared middleware
- #37 Multi-tenant Firestore datamodell og security rules
- #38 GDPR og samtykke: Personvern for mindreårige
- #46 CI/CD Pipeline: GitHub Actions → Firebase deploy med staging
- #49 **NY:** Firebase App Check — misbruksbeskyttelse for AI og API
- #50 **NY:** GDPR: Bytt GoogleAIBackend → VertexAIBackend (europe-west1)
- #51 **NY:** DPIA: Personvernkonsekvensvurdering (obligatorisk)
- #55 **NY:** Juridisk: Databehandleravtale-mal og vilkår for skoler

**Fase 2 — Kjernefunksjonalitet:**
- #8 Weaviate vektordatabase-oppsett for semantisk søk
- #11 Data-ingest: utdanning.no, DBH, Samordna opptak, NAV, SSB
- #34 LLM Backend: Hybridarkitektur (Firebase AI klient + Cloud Functions RAG) — **oppdatert**
- #35 RAG Pipeline: Kontekstuell AI med Weaviate-henting
- #39 Onboarding-flyt for elever, rådgivere og admin
- #40 Sanntid og streaming: Chat SSE, varsler og Firestore listeners
- #47 **NY:** Chat-persistens: Lagre samtalehistorikk i Firestore
- #53 **NY:** AI System Prompt: Karriereveileder-persona med kontekst

**Fase 3 — Avansert funksjonalitet:**
- #13 K-means clustering: Klynge-personaer og kollaborativ filtering
- #25 Observability: Logging, metrics og kostnadsovervåking
- #32 Stripe abonnementsmodell for skoler (EHF/Peppol obligatorisk)
- #41 Universell utforming (WCAG 2.1 AA)
- #43 Testing: Unit, integration og E2E for backend
- #44 Caching-lag: Semantisk og API-respons caching
- #45 Admin Dashboard Backend: Aggregerte statistikker og rapporter
- #48 **NY:** NAV Stillinger API: Ekte jobbdata for jobbmatch
- #52 **NY:** Studiedata-kobling: Frontend til ekte data fra ingest
- #54 **NY:** Rådgiverportal: Se elevprofiler og følge opp

**Fase 4:**
- #23 Frafallsrisiko-modell
- #42 Språkstøtte: Bokmål, nynorsk og samisk

### Lukkede issues (kun frontend/UI — backend mangler for de fleste)

#3, #4, #5, #6, #7, #9, #10, #12, #14, #15, #16, #17, #18, #19, #20, #21, #22, #24, #26, #27, #28, #29, #30, #31

> **NB:** Lukkede issues betyr at UI/frontend er implementert. De fleste trenger fortsatt backend-kobling. Sjekk issue-beskrivelsen for detaljer.

## KRITISKE FUNN FRA KODEAUDIT (mars 2026)

### 1. AI Chat er client-side Gemini — IKKE server-side
- `src/lib/firebase/ai.ts` bruker `firebase/ai` SDK med `GoogleAIBackend` + `gemini-2.5-flash`
- Alt kjører client-side — ingen server-side LLM
- **GoogleAIBackend er IKKE GDPR-kompatibel** — bruker global pool
- MÅ byttes til `VertexAIBackend` for europe-west1 (#50)
- Issue #34 er oppdatert med hybridarkitektur (klient + server)

### 2. Samtaler lagres IKKE
- `use-chat.ts` bruker `useState` — meldinger forsvinner ved sidenavigasjon
- Firestore CRUD finnes (`profiles.ts`) men er aldri koblet til chat
- Issue #47 dekker dette

### 3. Ketlcloud-branding i 18+ filer
- Se issue #1 for komplett liste over filer som må oppdateres
- Inkluderer sidebar, login, AI context, robots.txt, sitemap, Stripe URLs

### 4. Cloud Functions er 100% sandbox-boilerplate
- Kun notes CRUD, Stripe, API keys, admin fra ketlcloud
- INGENTING Suksess-spesifikt
- Package name er fortsatt `ketlcloud-functions`

### 5. App Check MANGLER — produksjonsrisiko
- Truffle Security (feb 2026): $82K regning fra én misbrukt API-nøkkel
- App Check med reCAPTCHA Enterprise er obligatorisk (#49)

## Viktige avhengigheter mellom issues

```
#50 (VertexAI GDPR) ← FØRST, enkel endring, KRITISK
#49 (App Check) ← FØR produksjon
#36 (CF infra) ← blokkerer → #34 (LLM), #35 (RAG), #11 (data-ingest), #48 (NAV)
#2 (Feide OIDC) ← blokkerer → #37 (multi-tenant), #38 (GDPR)
#8 (Weaviate) ← blokkerer → #35 (RAG pipeline)
#47 (chat-persistens) ← blokkerer → #53 (system prompt med profil)
#11 (data-ingest) ← blokkerer → #52 (frontend-kobling), #35 (RAG)
#51 (DPIA) + #55 (DPA-mal) ← FØR lansering til skoler
#34 (LLM backend) ← blokkerer → #40 (streaming), #44 (caching)
```

### Anbefalt implementeringsrekkefølge (Fase 1)
1. #50 VertexAI Backend (15 min endring, GDPR-kritisk)
2. #1 Rebranding (fjern alle ketlcloud-referanser)
3. #49 App Check (sikkerhet)
4. #36 Cloud Functions infrastruktur
5. #46 CI/CD Pipeline
6. #2 Feide OIDC
7. #37 Multi-tenant datamodell
8. #38/#51/#55 GDPR/DPIA/juridisk (parallelt)

## Tech stack

| Komponent | Teknologi |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | shadcn/ui v4, Tailwind CSS v4, Framer Motion |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions Gen 2) |
| Auth | Feide OIDC → Firebase Custom Tokens (planlagt) |
| AI | Firebase AI (Gemini 2.5 Flash) client-side → Hybridarkitektur med Genkit (planlagt) |
| ML | K-means clustering (Cloud Run, Python, planlagt) |
| Betaling | Stripe (B2B skolelisenser) + EHF/Peppol for offentlig sektor |
| CI/CD | GitHub Actions → Firebase deploy |
| Region | europe-west1 (GDPR) |

## Mappestruktur

```
suksess/
├── src/
│   ├── app/                    # Next.js App Router sider (26 sider)
│   │   ├── admin/              # Admin-dashboard (brukere, rådgivere, tenant, feature-flags)
│   │   ├── dashboard/          # Hoveddashboard
│   │   │   ├── abonnement/     # Stripe-abonnement
│   │   │   ├── analyse/        # Analysesider
│   │   │   ├── cv/             # CV-builder
│   │   │   ├── jobbmatch/      # Jobbmatch (hardkodet data — trenger #48)
│   │   │   ├── karakterer/     # Karakterregistrering
│   │   │   ├── karriere/       # Karriereutforsker (hardkodet data — trenger #52)
│   │   │   ├── karrieregraf/   # Branching karrieregraf
│   │   │   ├── mine-data/      # GDPR datainnsyn
│   │   │   ├── profil/         # Personlighetsprofil
│   │   │   ├── studier/        # Studieutforsker (trenger #52)
│   │   │   ├── veileder/       # AI-veileder chat (client-side Gemini — trenger #34/#47)
│   │   │   └── ...
│   │   ├── login/
│   │   ├── personvern/
│   │   └── pricing/
│   ├── components/
│   │   ├── motion/             # Framer Motion animasjoner
│   │   └── ui/                 # shadcn/ui komponenter
│   ├── hooks/
│   ├── lib/
│   │   ├── ai/                 # AI-hjelpefunksjoner + 3-lags cache
│   │   ├── firebase/           # Firebase-konfigurasjon (NB: ketlcloud fallbacks)
│   │   ├── gamification/       # XP-system med nivåer
│   │   ├── grades/             # Karakterberegning (226 linjer, ferdig)
│   │   ├── i18n/               # Bokmål + nynorsk
│   │   ├── karriere/           # Karrieredata (hardkodet, 452 linjer)
│   │   ├── personality/        # Big Five/RIASEC scoring + engine
│   │   └── stripe/             # Stripe config (REPLACE_ME prices)
│   ├── modules/
│   │   └── ai-assistant/       # AI-assistent modul (client-side)
│   └── types/
│       └── domain.ts           # Alle Firestore-typer
├── functions/                  # Firebase Cloud Functions (KUN ketlcloud-boilerplate)
│   └── src/
│       ├── index.ts            # Notes, Stripe, API keys, admin (ketlcloud)
│       └── middleware.ts       # withAuth, withAdmin, withValidation, rateLimit (solid)
├── e2e/                        # Playwright E2E-tester
├── public/
├── .github/workflows/          # GitHub Actions (deployer til ketlcloud — MÅ oppdateres)
├── .firebaserc                 # Peker til ketlcloud — MÅ oppdateres
├── firestore.rules             # 166 linjer, multi-tenant, rollebasert (ferdig)
└── package.json                # name: "sandbox-temp" — MÅ oppdateres
```

## Firebase-konfigurasjon

- `.firebaserc` peker per nå til `ketlcloud` — dette skal endres til nytt prosjekt-ID.
- Region: `europe-west1` (Belgia) — GDPR-krav.
- Ingen GitHub Secrets konfigurert for CI/CD ennå.

## Research-dokumentasjon

Detaljert research finnes i workspace:
- `research/feide-oidc.md` — 1087 linjer: Teknisk flyt, claims mapping, DPIA-krav
- `research/data-ingest.md` — 937 linjer: 7 norske API-kilder med endepunkter
- `research/weaviate-kmeans.md` — 1131 linjer: Cloud Flex $45/mnd, NorSBERT4, k=6-8
- `research/observability-stripe.md` — 683 linjer: Cloud Logging + Sentry, EHF/Peppol
- `research/firebase-ai-architecture.md` — 541 linjer: Hybridarkitektur, VertexAI, App Check
- `research/nav-stillinger-api.md` — 497 linjer: NAV feed, STYRK→RIASEC mapping
- `research/gdpr-minors-norway.md` — 528 linjer: Aldersgrense, DPIA, DPA, art. 22

Hvert åpent issue inneholder research-sammendrag med tekniske detaljer, API-endepunkter og kodeeksempler.

## Konvensjoner

- **Språk:** Norsk (bokmål) i all UI, issues og dokumentasjon.
- **Issues:** Detaljerte beskrivelser med akseptansekriterier, tasks som checkboxes, og labels.
- **Branch-strategi:** Feature branches → PR → merge til main.
- **Frontend-rammeverk:** shadcn/ui v4 (bruker `className`, IKKE `asChild` for knapper med lenker — bruk `<Link>` wrappet med `<Button>` via className-overføring).
