# ketl cloud

SaaS-boilerplate med Next.js, Firebase og TypeScript — klar til bruk for nye prosjekter.

## Funksjoner

- **Autentisering** — Google, e-post/passord, e-postlenke (passwordless), og anonym via Firebase Auth
- **Dashboard** — Admin-layout med sammenleggbar sidebar, topplinje og brukermeny
- **Admin-panel** — Brukeradministrasjon, statistikk-oversikt og feature flags
- **AI-assistent** — Popup chat-widget med streaming (Firebase AI Logic / Gemini)
- **Stripe-betaling** — Checkout, kundeportal, webhooks for abonnement
- **API-nøkler** — Utvikler-seksjon med opprett/slett/kopier API-nøkler
- **Feature flags** — Firestore-basert system med sanntidslytting og admin-UI
- **Onboarding** — Flerstegs velkomstflyt for nye brukere
- **Kontoinnstillinger** — Profil, avatar, passord, Google-kobling, slett konto
- **Tema** — Lys/mørk/system med localStorage-persistering
- **Datatabell** — Generisk komponent med sortering, søk og paginering
- **Skjema** — React Hook Form + Zod-validering med gjenbrukbare komponenter
- **Toast** — Varsler via Sonner (suksess, feil, info, lasting)
- **Lasteindikatorer** — Skeleton-loading for sider og komponenter
- **SEO** — Open Graph, robots.txt, sitemap.xml, JSON-LD
- **PWA** — Web App Manifest for installerbar app
- **Samtykke** — Cookie/analytics samtykkebanner med localStorage-persistering
- **Web Vitals** — Ytelsesrapportering til Analytics
- **API** — Cloud Functions med auth-middleware, Zod-validering og rate limiting
- **Firestore** — CRUD, sanntidslyttere, paginering, batch-operasjoner
- **Analytics** — Automatisk sidevisnings-sporing via Firebase Analytics
- **Testing** — Vitest + Testing Library
- **CI/CD** — GitHub Actions → Firebase deploy

## Kom i gang

```bash
# 1. Klon repoet
git clone https://github.com/andreas-t-hjertaker/sandbox.git
cd sandbox

# 2. Konfigurer miljøvariabler
cp .env.local.example .env.local
# Fyll inn verdiene fra Firebase Console

# 3. Installer avhengigheter
npm install
cd functions && npm install && cd ..

# 4. Start utviklingsserver
npm run dev
```

## Bruk som mal for nytt prosjekt

1. **Opprett nytt repo** fra denne malen (bruk "Use this template" på GitHub)
2. **Opprett Firebase-prosjekt** på [console.firebase.google.com](https://console.firebase.google.com)
3. **Oppdater konfigurasjon:**
   - `.env.local` — Firebase-nøkler fra prosjektet
   - `.firebaserc` — Endre `default` til ditt prosjekt-ID
4. **Aktiver Auth-metoder** i Firebase Console → Authentication → Sign-in method:
   - E-post/passord + E-postlenke
   - Google
   - Anonym (valgfritt)
5. **Aktiver Gemini** i Firebase Console → AI Logic (for AI-assistenten)
6. **Sett opp Stripe:**
   - Opprett konto på [stripe.com](https://stripe.com)
   - Legg til `STRIPE_SECRET_KEY` og `STRIPE_WEBHOOK_SECRET` i Cloud Functions-miljø
   - Legg til `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` i `.env.local`
   - Opprett produkter/priser i Stripe Dashboard
7. **Push til `main`** — GitHub Actions bygger og deployer automatisk

## Tech stack

| Lag | Teknologi |
|-----|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui v4 |
| Backend | Firebase Cloud Functions (Node.js 22) |
| Database | Cloud Firestore (NoSQL, sanntidssynk) |
| Autentisering | Firebase Auth (Google, e-post, passwordless, anonym) |
| Betaling | Stripe (Checkout, kundeportal, webhooks) |
| Lagring | Firebase Cloud Storage |
| AI | Firebase AI Logic (Gemini 2.5 Flash) — chat-assistent med streaming |
| Analytics | Firebase Analytics + Web Vitals |
| Hosting | Firebase Hosting (statisk eksport) |
| Skjema | React Hook Form + Zod v4-validering |
| Testing | Vitest, Testing Library |
| CI/CD | GitHub Actions → Firebase |

## Prosjektstruktur

```
src/
├── app/
│   ├── layout.tsx                 # Root layout (tema, auth, tooltips, toasts, samtykke)
│   ├── page.tsx                   # Landingsside
│   ├── loading.tsx                # Global lasteindikator
│   ├── robots.ts                  # robots.txt
│   ├── sitemap.ts                 # sitemap.xml
│   ├── login/
│   │   ├── layout.tsx             # Metadata for innlogging
│   │   └── page.tsx               # Innlogging (Google, e-post, passwordless, anonym)
│   ├── pricing/
│   │   ├── layout.tsx             # Metadata for priser
│   │   └── page.tsx               # Prisside med Stripe Checkout
│   ├── dashboard/
│   │   ├── layout.tsx             # Beskyttet layout med sidebar + AI-assistent + onboarding
│   │   ├── page.tsx               # Dashboard-oversikt med tjenestestatus
│   │   ├── loading.tsx            # Dashboard laste-skeleton
│   │   ├── dokumenter/page.tsx    # Datatabell-eksempel
│   │   ├── innstillinger/page.tsx # Profil, sikkerhet, avatar, slett konto
│   │   ├── abonnement/page.tsx    # Stripe-abonnement og kundeportal
│   │   └── utvikler/page.tsx      # API-nøkler (opprett/slett/kopier)
│   └── admin/
│       ├── layout.tsx             # Admin-beskyttet layout med egen sidebar
│       ├── page.tsx               # Admin-oversikt med statistikk
│       ├── brukere/page.tsx       # Brukeradministrasjon (roller, deaktiver, slett)
│       └── feature-flags/page.tsx # Feature flag-administrasjon
├── components/
│   ├── ui/                        # shadcn/ui komponenter
│   │   ├── button, card, badge, separator, input, label
│   │   ├── sheet, avatar, dropdown-menu, tooltip, skeleton
│   │   ├── table, data-table      # Generisk datatabell med sortering/søk
│   │   ├── form, textarea         # Skjema-primitiver
│   │   ├── sonner                 # Toast-wrapper
│   │   └── spinner                # Lasteindikator
│   ├── auth-provider.tsx          # AuthContext-wrapper
│   ├── theme-provider.tsx         # Tema-wrapper (lys/mørk/system)
│   ├── theme-toggle.tsx           # Tema-bytte-knapp
│   ├── sidebar.tsx                # Dashboard-sidebar (desktop + mobil, admin-lenke)
│   ├── protected-route.tsx        # Auth-vakt
│   ├── analytics-provider.tsx     # Automatisk sidevisnings-sporing
│   ├── consent-banner.tsx         # Cookie/analytics samtykkebanner
│   ├── json-ld.tsx                # Strukturert data (JSON-LD)
│   ├── onboarding-stepper.tsx     # Flerstegs velkomstflyt
│   └── error-boundary.tsx         # Feilgrense med fallback-UI
├── hooks/
│   ├── use-auth.ts                # Auth context + hook
│   ├── use-theme.ts               # Tema context + hook
│   ├── use-admin.ts               # Admin-rollesjekk (custom claims)
│   ├── use-feature-flags.ts       # Feature flags med sanntidslytting
│   ├── use-subscription.ts        # Stripe-abonnementsstatus
│   └── use-api-keys.ts            # API-nøkkeladministrasjon
├── lib/
│   ├── utils.ts                   # cn(), formatDate(), formatRelativeTime(), etc.
│   ├── toast.ts                   # showToast.success/error/info/loading
│   ├── api-client.ts              # HTTP-klient med auth-token og feilhåndtering
│   ├── web-vitals.ts              # Core Web Vitals-rapportering
│   ├── firebase/
│   │   ├── config.ts              # Firebase-initialisering (env vars med fallback)
│   │   ├── auth.ts                # Auth-hjelpere (Google, e-post, passwordless, anonym)
│   │   ├── firestore.ts           # CRUD, sanntidslyttere, paginering, batch
│   │   ├── storage.ts             # Opplasting med fremdrift
│   │   ├── analytics.ts           # Event- og sidevisnings-sporing
│   │   ├── ai.ts                  # Gemini (tekst, streaming, chat)
│   │   └── index.ts               # Re-exports
│   └── stripe/
│       ├── config.ts              # Stripe-initialisering
│       ├── pricing.ts             # Prisplaner og hjelpefunksjoner
│       └── index.ts               # Re-exports
├── modules/
│   └── ai-assistant/              # AI-assistent modul (selvinneholdt)
│       ├── index.ts               # Offentlig API (AiAssistant, useAiAssistant, typer)
│       ├── types.ts               # ChatMessage, AssistantContext, ChatConfig
│       ├── hooks/
│       │   └── use-chat.ts        # Chat-sesjon med streaming via Firebase AI
│       ├── components/
│       │   ├── ai-assistant.tsx   # Hovedkomponent (FAB + popup-panel)
│       │   ├── chat-bubble.tsx    # Meldingsboble (bruker/assistent, markdown)
│       │   ├── chat-input.tsx     # Tekst-input med auto-vekst
│       │   └── chat-messages.tsx  # Meldingsliste med auto-scroll
│       └── lib/
│           ├── context.ts         # Standard kontekst-bygger
│           └── system-prompt.ts   # System-instruksjon for AI
├── types/
│   └── index.ts                   # ApiResponse, User, WithId, WithTimestamps, SubscriptionStatus, ApiKey, etc.
└── __tests__/
    └── utils.test.ts              # Enhetstester for utilities

functions/
├── src/
│   ├── index.ts                   # Cloud Functions (health, admin, stripe, API-nøkler, konto)
│   └── middleware.ts              # withAuth, withAdmin, withApiKeyOrAuth, withValidation, rateLimit
├── package.json
└── tsconfig.json

firebase.json                      # Hosting, Functions, Firestore, Storage-konfig
firestore.rules                    # Sikkerhetsregler for Firestore
storage.rules                      # Sikkerhetsregler for Storage
.github/workflows/
└── firebase-deploy.yml            # CI/CD pipeline
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

`AuthProvider` lytter på `onAuthStateChanged` og deler brukertilstand via React context. `ProtectedRoute` omdirigerer til `/login` hvis bruker ikke er innlogget. `AdminProtectedRoute` sjekker i tillegg admin custom claims.

### Admin-panel

```
Admin → /admin → AdminProtectedRoute (sjekker admin custom claim)
                      ↓
              ┌───────────────────────────────┐
              │ Oversikt    │ Brukere          │
              │ (statistikk)│ (roller, søk)    │
              │             │                  │
              │ Feature     │                  │
              │ Flags       │                  │
              └───────────────────────────────┘
```

Admin-panelet har egen layout med separat navigasjon. Tilgang styres av Firebase custom claims (`admin: true`). Cloud Functions validerer admin-rolle server-side med `withAdmin` middleware.

### Stripe-betaling

```
Bruker → Prisside → Stripe Checkout → Webhook → Firestore (abonnement)
                                                       ↓
                                               Dashboard → Abonnementsside
                                                       ↓
                                               Stripe Kundeportal
```

Stripe Checkout håndterer betaling. Webhooks oppdaterer abonnementsstatus i Firestore. Kundeportalen lar brukere administrere abonnement og betalingsmetoder.

### Feature flags

```
Admin → /admin/feature-flags → Cloud Functions → Firestore (featureFlags)
                                                       ↓
                                           useFeatureFlags() → onSnapshot
                                                       ↓
                                              Komponent → isEnabled("key")
```

Feature flags lagres i Firestore `featureFlags`-collection. Frontend lytter i sanntid via `onSnapshot`. `isEnabled(key, userPlan?)` sjekker om flag er aktiv og plan-kompatibel.

### API-nøkler

```
Utvikler → /dashboard/utvikler → Cloud Functions → Firestore (apiKeys)
                                                         ↓
                                               Ekstern klient → API med Bearer-token
                                                         ↓
                                               withApiKeyOrAuth → Firestore
```

Utviklere kan opprette API-nøkler for programmatisk tilgang. `withApiKeyOrAuth` middleware godtar enten Firebase ID-token eller API-nøkkel.

### AI-assistent

```
Bruker → ChatInput → useChatSession → Firebase AI Logic (Gemini)
                          ↓                    ↓
                    setMessages()        sendMessageStream()
                          ↓                    ↓
                    ChatMessages ← streaming chunks ← Gemini API
```

AI-assistenten er en selvinneholdt modul under `src/modules/ai-assistant/`. Den bruker Firebase AI Logic direkte fra klienten — ingen API-ruter eller backend nødvendig.

**Nøkkelfunksjoner:**
- Streaming-svar med sanntidsoppdatering
- Kontekstbevisst system-prompt (brukerinfo, gjeldende side, tilgjengelige tjenester)
- Markdown-rendering av assistent-svar
- Automatisk sesjon-gjenskapning ved kontekstendring (side/bruker)
- FAB-knapp med popup chat-panel

**Tilpasning:**

```tsx
import { AiAssistant } from "@/modules/ai-assistant";

<AiAssistant
  title="Min assistent"
  welcomeMessage="Hei! Hvordan kan jeg hjelpe?"
  position="bottom-right"
  contextProvider={() => ({
    appName: "Min app",
    currentPath: window.location.pathname,
    customContext: "Ekstra kontekst for AI-en",
  })}
/>
```

### Onboarding

Ved første innlogging vises en flerstegs velkomstflyt:

1. **Velkommen** — kort intro til appen
2. **Sett opp profil** — navn og avatar
3. **Utforsk funksjoner** — oversikt over nøkkelfunksjoner
4. **Ferdig** — CTA til dashboard

Status lagres i Firestore (`onboardingComplete: true`). Kan hoppes over med "Hopp over"-knapp.

### API via Cloud Functions

```
Klient → fetch() med Bearer-token → Cloud Functions (europe-west1)
                                         ↓
                                   verifyIdToken() → Firestore
```

Beskyttede endepunkter validerer Firebase ID-tokens. Zod brukes for request-validering. Rate limiting beskytter mot misbruk.

**API-ruter:**

| Metode | Rute | Middleware | Beskrivelse |
|--------|------|-----------|-------------|
| GET | `/health` | — | Helsesjekk |
| POST | `/notes` | withAuth | Opprett notat |
| GET | `/notes` | withAuth | Hent notater |
| POST | `/checkout/create-session` | withAuth | Opprett Stripe checkout |
| POST | `/checkout/create-portal` | withAuth | Opprett Stripe kundeportal |
| POST | `/stripe/webhook` | — | Stripe webhook-handler |
| GET | `/api-keys` | withAuth | Hent brukers API-nøkler |
| POST | `/api-keys` | withAuth | Opprett API-nøkkel |
| DELETE | `/api-keys/:id` | withAuth | Slett API-nøkkel |
| DELETE | `/account` | withAuth | Slett brukerdata |
| GET | `/admin/stats` | withAdmin | Admin-statistikk |
| GET | `/admin/users` | withAdmin | Liste brukere |
| POST | `/admin/set-role` | withAdmin | Sett brukerrolle |
| GET | `/admin/feature-flags` | — | Hent feature flags |
| POST | `/admin/feature-flags` | withAdmin | Opprett feature flag |
| PUT | `/admin/feature-flags/:id` | withAdmin | Oppdater feature flag |

### CI/CD

Push til `main` → GitHub Actions bygger frontend + functions → deployer functions først → deployer hosting.

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
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API-nøkkel (trygg å eksponere) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth-domene |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Prosjekt-ID |
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
