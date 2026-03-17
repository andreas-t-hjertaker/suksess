# ketl cloud

AI-drevet system hvor agenter bygger og forvalter mikrotjenester.

## Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Firebase Functions (Node.js 20, TypeScript)
- **Database:** Firestore (NoSQL, sanntidssynk)
- **Storage:** Firebase Storage (`gs://ketlcloud.firebasestorage.app`)
- **AI:** Firebase AI Logic (Gemini via `firebase/ai`)
- **Analytics:** Firebase Analytics
- **Hosting:** Firebase Hosting via GitHub Actions

## Prosjektstruktur

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (dark, Geist font)
│   │   ├── page.tsx            # Forside
│   │   └── globals.css         # Tailwind + shadcn tema
│   ├── components/
│   │   ├── ui/                 # shadcn/ui komponenter
│   │   └── analytics-provider  # Auto page view tracking
│   └── lib/firebase/
│       ├── config.ts           # Firebase init (singleton)
│       ├── firestore.ts        # CRUD-hjelpere + sanntidslytter
│       ├── storage.ts          # Upload med progress
│       ├── analytics.ts        # Event + page tracking
│       ├── ai.ts               # Gemini (generateText, streamText, chat)
│       └── index.ts            # Re-exports
├── functions/
│   └── src/
│       └── index.ts            # Cloud Functions (HTTP, Firestore, Storage triggers)
├── firebase.json               # Hosting + Functions + Firestore + Storage config
├── firestore.rules             # Firestore sikkerhetsregler
├── storage.rules               # Storage sikkerhetsregler
└── .github/workflows/
    └── firebase-deploy.yml     # CI/CD: build → deploy hosting + functions
```

## Firebase-tjenester

| Tjeneste | Status | Bruk |
|----------|--------|------|
| Firestore | Aktiv | Primær database med sanntidssynk |
| Storage | Aktiv | Filopplasting og -lagring |
| Functions | Aktiv | Serverless backend (HTTP + triggers) |
| AI Logic | Aktiv | Gemini generativ AI fra klienten |
| Analytics | Aktiv | Page views + custom events |
| Hosting | Aktiv | Statisk hosting med CDN |

## Utvikling

```bash
# Frontend
npm install
npm run dev

# Functions
cd functions
npm install
npm run build
```

## Deploy

Push til `main` → GitHub Actions bygger og deployer automatisk.

Manuelt:
```bash
npm run build
firebase deploy
```
