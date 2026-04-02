# Nye issues fra kodegjennomgang (april 2026)

Basert på grundig gjennomgang av hele repoet. Sortert etter prioritet.

---

## Issue 1: Splitt `functions/src/index.ts` — 1811 linjer med 35+ handlers

**Labels:** `refactoring`, `must-have`

### Bakgrunn

`functions/src/index.ts` er 1811 linjer med 35+ route-handlers, webhook-logikk, admin-handlers, school-admin-handlers, og stibasert ruting i én fil. Dette gjør filen vanskelig å vedlikeholde, teste og code-reviewe.

### Nåværende tilstand
- 1811 linjer i én fil
- 35+ handler-funksjoner
- 6 logiske domener blandet: Stripe, Admin, School-admin, API-nøkler, E-post, XP
- Inline consent-verifiseringslogikk (50+ linjer) i ruting-koden (linje 1725-1785)
- Manuell stibasert ruting med startsWith-matching

### Implementasjon

Splitt i domenebaserte moduler:

```
functions/src/
├── handlers/
│   ├── stripe.ts          # Checkout, portal, webhook, B2B
│   ├── admin.ts           # set-role, users, stats, feature-flags
│   ├── school-admin.ts    # School-admin handlers
│   ├── api-keys.ts        # API-nøkkel CRUD
│   ├── email.ts           # E-post handlers (flytt fra index)
│   ├── xp.ts              # XP award/get
│   └── consent.ts         # Samtykke-verifisering
├── router.ts              # Route-tabell og matching
├── ehf.ts                 # Allerede utskilt ✅
├── middleware.ts           # Allerede utskilt ✅
└── index.ts               # Kun exports (health, api)
```

### Akseptkriterier
- [ ] Hver handler-modul < 300 linjer
- [ ] `index.ts` < 100 linjer (kun eksport + Firebase init)
- [ ] Alle 583 tester passerer
- [ ] Ingen endring i API-kontrakt

---

## Issue 2: Peppol-hemmeligheter eksponert i klient-side kode

**Labels:** `security`, `must-have`

### Bakgrunn

`src/lib/ehf/peppol-sender.ts` leser `process.env.PEPPOL_AP_KEY`, `PEPPOL_AP_URL` og `PEPPOL_SENDER_ID` — dette er server-hemmeligheter som blir eksponert hvis filen importeres i klient-side kode. Filen har ingen `"use server"`-direktiv.

### Implementasjon
- [ ] Legg til `"use server"` øverst i `src/lib/ehf/peppol-sender.ts`
- [ ] Alternativt: Flytt all Peppol-sending til `functions/src/ehf.ts` (som allerede har sin egen implementasjon) og fjern klient-side `peppol-sender.ts`
- [ ] Verifiser at `invoice-generator.ts` ikke importerer `peppol-sender.ts`

### Akseptkriterier
- [ ] Ingen server-hemmeligheter tilgjengelig i klient-bundle
- [ ] Peppol-sending fungerer kun via Cloud Functions

---

## Issue 3: Silent failures i cache/AI-moduler — manglende observabilitet

**Labels:** `refactoring`, `should-have`

### Bakgrunn

Flere moduler i `src/lib/ai/` har tomme catch-blokker som svelger feil uten logging:
- `src/lib/ai/cache.ts` (linje 91-93, 111-112, 167-168)
- `src/lib/ai/semantic-cache.ts` (linje 127-130, 154-156)
- `src/lib/karriere/data-service.ts` (linje 157-159, 200-202)

Strukturert logging (`src/lib/observability/logger.ts`) eksisterer men brukes ikke i disse modulene. I produksjon er feil usynlige.

### Implementasjon
- [ ] Erstatt tomme catch-blokker med `logger.warn()` kall
- [ ] Legg til kontekst (modul, operasjon, feilmelding) i logger-kall
- [ ] Opprett felles mønster for graceful degradation med logging

### Akseptkriterier
- [ ] Ingen tomme catch-blokker i `src/lib/ai/`
- [ ] Alle cache-feil logges med kontekst
- [ ] Graceful degradation beholdes (feil krasjer ikke appen)

---

## Issue 4: Store dashboard-sider bør splittes i komponenter

**Labels:** `refactoring`, `should-have`

### Bakgrunn

Flere dashboard-sider er over 600 linjer med interne komponenter som bør ekstraheres:

| Fil | Linjer | Interne komponenter |
|-----|--------|-------------------|
| `dashboard/karakterer/page.tsx` | 746 | PointCard, Delta, StudyGroup, ProgramfagRisiko |
| `dashboard/foresatt/page.tsx` | 690 | Student insight, guardian link management |
| `dashboard/cv/page.tsx` | 666 | CvPreview (113 linjer) |
| `dashboard/innstillinger/page.tsx` | 645 | Profil, passord, Google-kobling, foresatt, locale |
| `dashboard/karriere/page.tsx` | 632 | CareerCard, DemandBadge |
| `admin/radgivere/page.tsx` | 654 | Trafikklys, CSV-eksport, statistikk |

### Implementasjon
- [ ] Ekstraher `PointCard` → `src/components/stat-card.tsx` (gjenbrukbar)
- [ ] Ekstraher `CvPreview` → `src/components/cv-preview.tsx`
- [ ] Ekstraher `CareerCard` → `src/components/career-card.tsx`
- [ ] Splitt `innstillinger/page.tsx` i seksjoner med custom hooks
- [ ] Splitt `karakterer/page.tsx` — trekk ut kalkulator og simulator

### Akseptkriterier
- [ ] Ingen dashboard-side > 500 linjer
- [ ] Delte komponenter gjenbrukes der mulig
- [ ] Ingen funksjonell endring

---

## Issue 5: Manglende error states i dashboard-sider

**Labels:** `ux`, `should-have`

### Bakgrunn

Flere dashboard-sider mangler feilhåndtering i UI:
- `karakterer/page.tsx` — Ingen error state ved feil i `useGrades()`
- `foresatt/page.tsx` — `loadStudentInsight()` kan feile stille
- `cv/page.tsx` — Ingen ErrorState fallback ved profilhenting
- `analyse/page.tsx` — Mangler null-sjekker for profildata

`ErrorState` og `EmptyState` komponenter eksisterer men brukes ikke konsekvent.

### Implementasjon
- [ ] Legg til `ErrorState` i alle dashboard-sider som henter data
- [ ] Legg til `EmptyState` der tomme resultater er mulig
- [ ] Standardiser mønster: loading → error → empty → data

### Akseptkriterier
- [ ] Alle dashboard-sider har error/empty states
- [ ] Konsistent bruk av `ErrorState`/`EmptyState` fra `src/components/`

---

## Issue 6: Klient-side rate limiting kan omgås

**Labels:** `security`, `should-have`

### Bakgrunn

`src/lib/ai/safety.ts` (linje 140-191) implementerer rate limiting via `localStorage`. Brukere kan omgå dette ved å tømme localStorage eller bruke privat nettleser.

### Nåværende tilstand
- AI chat rate limiting: kun klient-side localStorage
- Cloud Functions har `rateLimit(100, 60_000)` men dette er per IP, ikke per bruker
- Issue #145 dekker server-side rate limiting men fokuserer på Cloud Functions

### Implementasjon
- [ ] Flytt AI chat rate limiting til Firestore (brukerbasert)
- [ ] Bruk `users/{uid}/rateLimit` subcollection med TTL
- [ ] Behold klient-side sjekk som første forsvarslinje (UX)
- [ ] Server-side validering i SSE proxy (`api/chat/stream/route.ts`)

### Akseptkriterier
- [ ] Rate limiting fungerer selv om klient-state tømmes
- [ ] Server-side enforcement i chat-endepunktet
- [ ] Klient-side gir umiddelbar feedback

---

## Issue 7: Duplisert STYRK-RIASEC mapping

**Labels:** `refactoring`, `nice-to-have`

### Bakgrunn

STYRK-08 til RIASEC-kode mapping eksisterer i to separate filer:
- `src/lib/jobbmatch/nav-stillinger.ts` (linje 69-103) — `STYRK_RIASEC_MAP`
- `src/lib/karriere/data-service.ts` — `CAREER_STYRK_MAP`

Disse kan divergere over tid.

### Implementasjon
- [ ] Opprett `src/lib/mappings/styrk-riasec.ts` med felles mapping
- [ ] Importer fra begge moduler
- [ ] Legg til tester for mapping-konsistens

### Akseptkriterier
- [ ] Én autoritativ STYRK-RIASEC mapping
- [ ] Brukes av både jobbmatch og karriere-modulen

---

## Issue 8: Duplisert TTL/cache-logikk i AI-moduler

**Labels:** `refactoring`, `nice-to-have`

### Bakgrunn

Tre separate cache-lag implementerer nesten identisk TTL-logikk:
- `src/lib/ai/cache.ts` — `(Date.now() - createdAt.getTime()) / 3600000`
- `src/lib/ai/semantic-cache.ts` — `Date.now() - new Date(entry.createdAt).getTime()`
- `src/lib/ai/safety.ts` — Rate limit aldersberegning

### Implementasjon
- [ ] Opprett `src/lib/utils/ttl.ts` med `isExpired()` og `calculateAgeHours()`
- [ ] Refaktorer alle tre moduler til å bruke felles TTL-utility

### Akseptkriterier
- [ ] Felles TTL-beregning
- [ ] Alle eksisterende tester passerer

---

## Issue 9: Tilgjengelighet: manglende label-input-kobling og ARIA

**Labels:** `a11y`, `should-have`

### Bakgrunn

Flere sider har `eslint-disable-next-line jsx-a11y/label-has-associated-control` for å omgå manglende label-kobling:
- `karakterer/page.tsx` (linje 286-287, 307-308, 431-432)
- `innstillinger/page.tsx` — Skjemaseksjoner mangler konsistent overskriftshierarki
- `foresatt/page.tsx` — Student-velger tabs mangler `role="tablist"` på wrapper
- `karriere/page.tsx` — CareerCard er `<button>` med nestet interaktivt innhold

### Implementasjon
- [ ] Fiks label-input-koblinger (fjern eslint-disable)
- [ ] Legg til `aria-label` på kontekst-fattge knapper (årsvalg, term-valg)
- [ ] Bruk semantisk overskriftshierarki i innstillinger
- [ ] Sjekk tab-navigasjon og skjermleser-kompatibilitet

### Akseptkriterier
- [ ] Ingen `eslint-disable` for a11y-regler
- [ ] WCAG 2.2 AA-samsvar for alle dashboard-sider

---

## Issue 10: Inkonsistent timestamp-håndtering

**Labels:** `refactoring`, `nice-to-have`

### Bakgrunn

To ulike mønstre for timestamps brukes om hverandre:
1. Firebase `serverTimestamp()` — Firestore-dokumenter
2. `new Date().toISOString()` — Cache og logging
3. `Date.now()` — Noen steder

`semantic-cache.ts` linje 149 bruker `toISOString()`, mens `eu-ai-act.ts` linje 196 gjør det samme. Firestore-dokumenter bruker `serverTimestamp()`.

### Implementasjon
- [ ] Dokumenter standarder: `serverTimestamp()` for Firestore, `new Date().toISOString()` for logging
- [ ] Opprett `src/lib/utils/time.ts` med `now()` og `formatTimestamp()` for konsistens

### Akseptkriterier
- [ ] Dokumentert standard for timestamp-bruk
- [ ] Konsistent bruk i nye moduler

---

## Issue 11: Manglende input-validering i personality/scoring

**Labels:** `bug`, `should-have`

### Bakgrunn

`src/lib/personality/scoring.ts` (linje 26-64) antar at svar er mellom 1-5 uten validering. Ugyldige verdier (0, 6, -1, NaN) kan gi feil personlighetsprofil uten feilmelding.

### Implementasjon
- [ ] Valider at alle svar er heltall mellom 1 og 5
- [ ] Returner feilmelding ved ugyldig input
- [ ] Legg til Zod-skjema for personlighetssvar

### Akseptkriterier
- [ ] Ugyldig input gir tydelig feilmelding
- [ ] Validering dekket av tester

---

## Issue 12: Manglende Firestore TTL for EU AI Act audit-logger

**Labels:** `compliance`, `should-have`

### Bakgrunn

`src/lib/ai/eu-ai-act.ts` (linje 193-224) logger AI-beslutninger med kommentar "minimum 5 års oppbevaring" i henhold til EU AI Act. Men ingen TTL-policy er satt i Firestore for automatisk sletting etter oppbevaringsperioden.

### Implementasjon
- [ ] Sett opp Firestore TTL-policy for `aiDecisionLogs` collection
- [ ] Legg til `retentionExpiresAt` felt i logg-dokumenter (createdAt + 5 år)
- [ ] Konfigurer TTL-indeks i `firestore.indexes.json`

### Akseptkriterier
- [ ] AI decision logs slettes automatisk etter 5 år
- [ ] TTL-policy dokumentert

---

## Issue 13: State-reduksjon i komplekse dashboard-sider

**Labels:** `refactoring`, `nice-to-have`

### Bakgrunn

Noen sider har mange useState-kall som bør grupperes:
- `karakterer/page.tsx` — 13 useState-kall
- `innstillinger/page.tsx` — 10 useState-kall
- `foresatt/page.tsx` — 7 useState-kall

### Implementasjon
- [ ] Ekstraher `useGradeForm()` custom hook for karakterer
- [ ] Ekstraher `useSettingsSections()` for innstillinger
- [ ] Ekstraher `useStudentInsight()` for foresatt

### Akseptkriterier
- [ ] Hver side har maks 5 direkte useState-kall
- [ ] Custom hooks har tester
