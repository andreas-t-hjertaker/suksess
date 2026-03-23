# Suksess

AI-drevet karriere- og utdanningsveiledning for norske videregående elever.

## Funksjoner

- **AI-veileder** — Personlig chat-assistent med streaming (Firebase AI Logic / Gemini)
- **Karakterkalkulator** — Beregn snitt, simuler karakterer og se risikoanalyse
- **Karriereveiledning** — Utforsk karrieremuligheter basert på interesser og styrker
- **Karrieregraf** — Visualiser karriereveier og utdanningsløp
- **CV-builder** — Bygg og eksporter CV tilpasset norsk arbeidsmarked
- **Søknadscoach** — Hjelp til universitets- og høyskolesøknad (SO-poeng)
- **Studier** — Planlegg og spor studieforløp
- **Jobbmatch** — Finn relevante stillinger via NAV Arbeidsplassen
- **Fremgang** — Gamification med XP, nivåer og achievements
- **Analyse** — Innsikt i egen faglig utvikling
- **Autentisering** — Google, e-post/passord og anonym via Firebase Auth
- **Onboarding** — Flerstegs velkomstflyt for nye brukere
- **Kontoinnstillinger** — Profil, avatar, passord, Google-kobling, slett konto
- **Tema** — Lys/mørk/system med localStorage-persistering
- **PWA** — Installerbar app med offline-støtte
- **Varsler** — Sanntidsvarsler via Firestore
- **API-nøkler** — Utvikler-seksjon med opprett/slett/kopier
- **Admin-panel** — Brukeradministrasjon, statistikk og feature flags
- **Testing** — Vitest + Testing Library
- **CI/CD** — GitHub Actions → Firebase deploy

## Kom i gang

```bash
# 1. Klon repoet
git clone https://github.com/andreas-t-hjertaker/suksess.git
cd suksess

# 2. Konfigurer miljøvariabler
cp .env.local.example .env.local
# Fyll inn verdiene fra Firebase Console

# 3. Installer avhengigheter
npm install
cd functions && npm install && cd ..

# 4. Start utviklingsserver
npm run dev
```

## Tech stack

| Lag | Teknologi |
|-----|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui v4, Base UI |
| Backend | Firebase Cloud Functions (Node.js 22) |
| Database | Cloud Firestore (NoSQL, sanntidssynk) |
| Autentisering | Firebase Auth (Google, e-post, anonym) |
| AI | Firebase AI Logic (Gemini 2.5 Flash) — streaming chat |
| Analytics | Firebase Analytics + Web Vitals |
| Hosting | Firebase Hosting (statisk eksport) |
| Skjema | React Hook Form + Zod v4-validering |
| Betaling | Stripe (Checkout, kundeportal, webhooks) |
| Testing | Vitest, Testing Library |
| CI/CD | GitHub Actions → Firebase |

## Prosjektstruktur

```
src/
├── app/
│   ├── layout.tsx                 # Root layout (tema, auth, toasts, samtykke)
│   ├── page.tsx                   # Landingsside
│   ├── login/page.tsx             # Innlogging
│   ├── pricing/page.tsx           # Prisside med Stripe Checkout
│   ├── dashboard/
│   │   ├── layout.tsx             # Beskyttet layout med sidebar + AI-assistent
│   │   ├── page.tsx               # Dashboard-oversikt
│   │   ├── karakterer/page.tsx    # Karakterkalkulator med risikoanalyse
│   │   ├── karriere/page.tsx      # Karriereveiledning
│   │   ├── karrieregraf/page.tsx  # Karriere- og utdanningsvisualiseringsgraf
│   │   ├── cv/page.tsx            # CV-builder
│   │   ├── soknadscoach/page.tsx  # Søknadscoach (SO-poeng og universitetsopptak)
│   │   ├── studier/page.tsx       # Studieplanlegger
│   │   ├── jobbmatch/page.tsx     # Jobbmatch via NAV Arbeidsplassen
│   │   ├── fremgang/page.tsx      # XP, nivåer og achievements
│   │   ├── analyse/page.tsx       # Faglig analyse og innsikt
│   │   ├── veileder/page.tsx      # Dedikert AI-veileder-side
│   │   ├── profil/page.tsx        # Brukerprofil
│   │   ├── innstillinger/page.tsx # Konto- og sikkerhetsinnstillinger
│   │   ├── abonnement/page.tsx    # Stripe-abonnement
│   │   ├── mine-data/page.tsx     # Dataeksport og personvern
│   │   └── utvikler/page.tsx      # API-nøkler
│   └── admin/
│       ├── layout.tsx             # Admin-beskyttet layout
│       ├── page.tsx               # Admin-oversikt
│       ├── brukere/page.tsx       # Brukeradministrasjon
│       └── feature-flags/page.tsx # Feature flag-administrasjon
├── components/
│   ├── ui/                        # shadcn/ui + Base UI komponenter
│   ├── sidebar.tsx                # Dashboard-sidebar (desktop + mobil)
│   ├── protected-route.tsx        # Auth-vakt
│   ├── notification-bell.tsx      # Varselklokke
│   ├── onboarding-stepper.tsx     # Flerstegs velkomstflyt
│   └── feature-gate.tsx           # Feature flag-gate
├── hooks/
│   ├── use-auth.ts                # Auth context + hook
│   ├── use-xp.ts                  # Gamification (XP, nivåer, achievements)
│   ├── use-tenant.ts              # Multi-tenant isolasjon
│   ├── use-admin.ts               # Admin-rollesjekk
│   ├── use-feature-flags.ts       # Feature flags med sanntidslytting
│   └── use-implicit-profiling.ts  # Atferdsbasert UI-tilpasning
├── lib/
│   ├── gamification/xp.ts         # XP-verdier, nivåer og achievements
│   ├── firebase/                  # Firebase-initialisering og hjelpere
│   └── stripe/                    # Stripe-konfigurasjon
└── modules/
    └── ai-assistant/              # AI-assistent modul (selvinneholdt)
```

## Arkitektur

### Statisk eksport + klient-side Firebase

Prosjektet bruker `output: "export"` i Next.js — alt serveres som statiske filer via Firebase Hosting. All forretningslogikk kjører i nettleseren med Firebase JS SDK.

### Autentisering

```
Bruker → Login-side → Firebase Auth → AuthProvider (context)
                                         ↓
                                   ProtectedRoute → Dashboard
                                         ↓
                              AdminProtectedRoute → Admin-panel
```

### Gamification

Suksess bruker et XP-system for å motivere elever:

- **XP-events**: daglig innlogging, fullføre profil, legge til karakterer, bruke AI-veileder, m.m.
- **Nivåer**: beregnes fra total XP med progressiv kurve
- **Achievements**: låses opp ved milepæler (streak, antall karakterer, etc.)
- **Data lagres** i Firestore under `users/{uid}/gamification/xp`

### AI-assistent

```
Bruker → ChatInput → useChatSession → Firebase AI Logic (Gemini)
                          ↓                    ↓
                    setMessages()        sendMessageStream()
                          ↓                    ↓
                    ChatMessages ← streaming chunks ← Gemini API
```

Kontekstbevisst system-prompt inkluderer brukerinfo, gjeldende side og Suksess-spesifikk kontekst.

### Multi-tenant

`useTenant` leser `tenantId` og `role` fra Firebase custom claims. Roller: `student`, `counselor`, `admin`, `superadmin`. Tilgangsstyring via `canAccess(resource)`.

## Skript

| Kommando | Beskrivelse |
|----------|-------------|
| `npm run dev` | Start utviklingsserver |
| `npm run build` | Bygg for produksjon (statisk eksport) |
| `npm run test` | Kjør tester med Vitest |
| `npm run lint` | Lint med ESLint |

## Miljøvariabler

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API-nøkkel |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth-domene |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Prosjekt-ID (`suksess-842ed`) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage-bøtte |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender-ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App-ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics measurement-ID |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

**Cloud Functions-miljøvariabler** (settes via Firebase CLI):

| Variabel | Beskrivelse |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe hemmelig nøkkel |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook-signering |

> **NB:** Firebase API-nøkler er prosjektidentifikatorer og er trygge å eksponere i klienten. Sikkerhet håndteres av Firebase Security Rules og Auth.

## CI/CD

Push til `main` → GitHub Actions bygger frontend + functions → deployer functions først → deployer hosting til Firebase (`suksess-842ed`).
