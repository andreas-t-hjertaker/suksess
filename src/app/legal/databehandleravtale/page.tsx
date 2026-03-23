import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Databehandleravtale — Suksess AS",
  robots: { index: false },
};

const CURRENT_VERSION = "2026-03-01";

export default function DatabehandleravtalePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
      <h1>Databehandleravtale</h1>
      <p className="lead">
        Denne databehandleravtalen («DBA») regulerer Suksess AS sin behandling av
        personopplysninger på vegne av skolen/fylkeskommunen («Behandlingsansvarlig»)
        i forbindelse med bruk av Suksess AI-karriereveiledningsplattform.
      </p>
      <p className="text-sm text-muted-foreground">
        Inngås i henhold til GDPR art. 28 og personopplysningsloven §15.
        Versjon {CURRENT_VERSION}.
      </p>

      <h2>1. Parter og roller</h2>
      <table>
        <tbody>
          <tr>
            <td><strong>Behandlingsansvarlig</strong></td>
            <td>Den enkelte skole eller fylkeskommune som inngår avtale om bruk av Suksess-plattformen</td>
          </tr>
          <tr>
            <td><strong>Databehandler</strong></td>
            <td>Suksess AS, org.nr. [FYLLES INN], [adresse]</td>
          </tr>
        </tbody>
      </table>

      <h2>2. Formål og behandlingsgrunnlag</h2>
      <p>
        Databehandler behandler personopplysninger utelukkende for å levere
        tjenesten Suksess AI-karriereveiledning til Behandlingsansvarlig.
        Behandlingsgrunnlag er GDPR art. 6(1)(e) (offentlig interesse/
        myndighetsutøvelse) for videregående opplæring, supplert av
        art. 9(2)(g) for særlige kategorier data.
      </p>

      <h2>3. Hvilke personopplysninger behandles</h2>
      <ul>
        <li>Navn, e-post og Feide-ID (identifikasjon)</li>
        <li>Personnummer-basert aldersverifisering (kun for samtykkeformål)</li>
        <li>Personlighetsprofil (Big Five-skårer)</li>
        <li>Interesseprofil (RIASEC-koder)</li>
        <li>Frafallsrisiko-score (aggregert, ikke diagnose)</li>
        <li>Chat-samtalehistorikk med AI-veileder</li>
        <li>Valg av studieprogram og fagkombinasjon</li>
        <li>Innloggingstidspunkt og aktivitetslogg</li>
      </ul>

      <h2>4. Lagringssted og underleverandører</h2>
      <p>
        All data lagres i Google Cloud Firestore i regionen{" "}
        <strong>europe-west1 (Belgia)</strong> innenfor EØS.
        AI-behandling skjer via Google Cloud Vertex AI i samme region.
        Data forlater ikke EØS.
      </p>
      <h3>Underleverandører (underdatabehandlere)</h3>
      <table>
        <thead>
          <tr><th>Leverandør</th><th>Tjeneste</th><th>Lagringssted</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Google Cloud (Firebase/Vertex AI)</td>
            <td>Database, autentisering, AI-inferens</td>
            <td>europe-west1 (Belgia)</td>
          </tr>
          <tr>
            <td>Weaviate Cloud</td>
            <td>Vektordatabase for RAG</td>
            <td>EU (GCP)</td>
          </tr>
          <tr>
            <td>Feide (Sikt)</td>
            <td>Identitetsfederasjon</td>
            <td>Norge</td>
          </tr>
        </tbody>
      </table>
      <p>
        Behandlingsansvarlig godkjenner bruk av ovennevnte underdatabehandlere
        ved aksept av denne avtalen. Suksess AS varsler om endringer med
        minst 30 dagers forvarsel.
      </p>

      <h2>5. Databehandlers plikter</h2>
      <ul>
        <li>Behandle personopplysninger kun etter dokumenterte instrukser fra Behandlingsansvarlig</li>
        <li>Sikre at autorisert personell er underlagt konfidensialitetsplikt</li>
        <li>Iverksette tekniske og organisatoriske sikkerhetstiltak (GDPR art. 32)</li>
        <li>Varsle Behandlingsansvarlig om avvik/brudd uten ugrunnet opphold, senest innen 36 timer</li>
        <li>Bistå med oppfyllelse av de registrertes rettigheter (innsyn, retting, sletting, portabilitet)</li>
        <li>Slette eller tilbakelevere alle personopplysninger ved opphør av avtaleforholdet</li>
        <li>Stille nødvendig informasjon til rådighet for etterlevelseskontroll og revisjon</li>
      </ul>

      <h2>6. Sikkerhetstiltak (art. 32)</h2>
      <ul>
        <li><strong>Kryptering:</strong> Data kryptert i hvile (AES-256) og under overføring (TLS 1.3)</li>
        <li><strong>Tilgangskontroll:</strong> Firebase Security Rules, multi-tenant isolasjon (tenantId)</li>
        <li><strong>Autentisering:</strong> Feide OIDC + Firebase App Check med reCAPTCHA Enterprise</li>
        <li><strong>Logging:</strong> Audit trail for alle admin-handlinger</li>
        <li><strong>Penetrasjonstesting:</strong> Gjennomføres minst én gang per år</li>
        <li><strong>Sårbarhetshåndtering:</strong> Kritiske oppdateringer innen 72 timer</li>
      </ul>

      <h2>7. De registrertes rettigheter</h2>
      <p>
        Behandlingsansvarlig er ansvarlig for å motta og videresende forespørsler
        til Databehandler. Databehandler bistår innen 5 virkedager med teknisk
        gjennomføring av:
      </p>
      <ul>
        <li>Innsyn i egne data (GDPR art. 15)</li>
        <li>Retting av uriktige data (art. 16)</li>
        <li>Sletting («rett til å bli glemt», art. 17)</li>
        <li>Begrensning av behandling (art. 18)</li>
        <li>Dataportabilitet — eksport i JSON-format (art. 20)</li>
        <li>Protest mot behandling (art. 21)</li>
      </ul>

      <h2>8. Mindreårige og foreldresamtykke</h2>
      <p>
        For elever under 16 år kreves samtykke fra foresatte for behandling av
        personlighetsprofil og AI-samtalehistorikk, jf. GDPR art. 8.
        Suksess-plattformen implementerer aldersverifisering ved onboarding
        og lagrer dokumentasjon på samtykke (se Issue #38).
      </p>

      <h2>9. Varighet og opphør</h2>
      <p>
        Avtalen løper parallelt med abonnementsavtalen. Ved opphør sletter
        Databehandler alle personopplysninger tilhørende Behandlingsansvarligs
        tenant innen 30 dager, med mindre lovpålagt lengre oppbevaringstid gjelder.
        Sikkerhetskopidata slettes innen 90 dager.
      </p>

      <h2>10. Ansvar og erstatning</h2>
      <p>
        Partene er ansvarlige overfor de registrerte i henhold til GDPR art. 82.
        Databehandlers ansvar er begrenset til dokumenterte tap som direkte
        følge av brudd på denne avtalen eller GDPR, begrenset oppad til
        det beløpet Behandlingsansvarlig har betalt i abonnementsavgift
        de siste 12 månedene.
      </p>

      <h2>11. Kontaktpunkt for personvern</h2>
      <ul>
        <li><strong>Databehandler DPO:</strong> personvern@suksess.no</li>
        <li><strong>Avviksvarsling:</strong> avvik@suksess.no (24/7)</li>
        <li><strong>Datatilsynet:</strong>{" "}
          <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer">
            datatilsynet.no
          </a>
        </li>
      </ul>

      <p className="text-sm text-muted-foreground mt-8">
        Versjon: {CURRENT_VERSION}. Denne avtalen er en del av den samlede
        avtalen mellom skolen og Suksess AS. Ved motstrid går DBA foran
        generelle vilkår for det som gjelder personvernspørsmål.
      </p>
    </main>
  );
}
