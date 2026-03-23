import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vilkår for bruk — Suksess",
  robots: { index: true },
};

const CURRENT_VERSION = "2026-03-01";

export default function VilkarPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
      <h1>Vilkår for bruk</h1>
      <p className="lead">
        Disse vilkårene gjelder for skoler og fylkeskommuner («Skolen») som
        abonnerer på Suksess AI-karriereveiledningsplattform, levert av
        Suksess AS («Leverandøren»).
      </p>
      <p className="text-sm text-muted-foreground">Versjon {CURRENT_VERSION}.</p>

      <h2>1. Tjenestebeskrivelse</h2>
      <p>
        Suksess er en AI-drevet karriereveiledningsplattform for norske
        videregående skoleelever. Plattformen tilbyr:
      </p>
      <ul>
        <li>Personlighetstesting (Big Five) og interessekartlegging (RIASEC)</li>
        <li>Personaliserte anbefalinger om studievalg og karriereveier</li>
        <li>AI-drevet karriereveiledningschat</li>
        <li>Frafallsrisiko-analyse og rådgiverportal</li>
        <li>Kobling til utdanningsdata (Samordna opptak, DBH, NAV)</li>
      </ul>

      <h2>2. Abonnement og betaling</h2>
      <p>
        Abonnement faktureres per elev per skoleår. Priser fremgår av
        separat tilbud eller prisliste. Betaling via Stripe fakturering.
        Ubenyttede lisenser refunderes ikke, men kan overføres innen
        samme skoleår.
      </p>

      <h2>3. Skolens plikter</h2>
      <ul>
        <li>Utpeke en ansvarlig administrator («Kontaktperson») for plattformen</li>
        <li>
          Sørge for at elever og foresatte er informert om behandlingen av
          personopplysninger i henhold til GDPR art. 13/14
        </li>
        <li>Innhente nødvendig samtykke fra foresatte for elever under 16 år</li>
        <li>Ikke gi tilgang til uautoriserte brukere</li>
        <li>Varsle Leverandøren umiddelbart ved mistanke om sikkerhetsbrudd</li>
        <li>
          Inngå separat Databehandleravtale (DBA) før behandling av
          personopplysninger påbegynnes
        </li>
      </ul>

      <h2>4. Leverandørens forpliktelser</h2>
      <ul>
        <li>Levere tjenesten med rimelig oppetid (mål: 99,5 % månedlig)</li>
        <li>Varsle om planlagt nedetid med minst 48 timers forvarsel</li>
        <li>
          Behandle personopplysninger i samsvar med DBA og gjeldende
          personvernlovgivning
        </li>
        <li>Tilby kundestøtte på norsk (e-post) i ordinær arbeidstid</li>
        <li>
          Oppdatere AI-modeller og fagdata minst hvert semester for å
          sikre aktualitet
        </li>
      </ul>

      <h2>5. Immaterielle rettigheter</h2>
      <p>
        All programvare, AI-modeller, design og innhold tilhører Leverandøren
        eller Leverandørens lisensgivere. Skolen får en ikke-eksklusiv,
        ikke-overførbar bruksrett begrenset til avtaleperioden.
        Elevenes data tilhører eleven og Skolen — Leverandøren har ingen
        rett til å bruke disse til opplæring av AI-modeller uten eksplisitt
        samtykke.
      </p>

      <h2>6. Personvern</h2>
      <p>
        Behandling av personopplysninger reguleres av separat{" "}
        <a href="/legal/databehandleravtale">Databehandleravtale</a>.
        Se også{" "}
        <a href="/legal/personvern">Personvernerklæring</a> og{" "}
        <a href="/legal/dpia">DPIA</a>.
      </p>

      <h2>7. Ansvarsbegrensning</h2>
      <p>
        Leverandørens samlede ansvar overfor Skolen er begrenset til summen
        av abonnementsavgifter betalt de siste 12 månedene. Leverandøren
        er ikke ansvarlig for indirekte tap, tapt fortjeneste eller
        elevenes utdanningsvalg basert på AI-anbefalinger.
      </p>
      <p>
        AI-anbefalinger er veiledende — ikke bindende råd. Skolen og
        eleven er selv ansvarlige for endelige utdannings- og karrierevalg.
      </p>

      <h2>8. Avtalens varighet og oppsigelse</h2>
      <p>
        Avtalen er tidsbegrenset til ett skoleår med automatisk fornyelse
        med 30 dagers oppsigelsesvarsel. Oppsigelse meldes skriftlig
        til{" "}
        <a href="mailto:kontrakt@suksess.no">kontrakt@suksess.no</a>.
        Ved oppsigelse slettes alle elevdata i henhold til DBA §9.
      </p>

      <h2>9. Endringer i vilkårene</h2>
      <p>
        Leverandøren kan endre disse vilkårene med 30 dagers skriftlig
        varsel. Fortsatt bruk etter varselperiodens utløp anses som
        aksept av nye vilkår. Vesentlige endringer krever eksplisitt
        skriftlig aksept.
      </p>

      <h2>10. Lovvalg og tvisteløsning</h2>
      <p>
        Avtalen er underlagt norsk rett. Tvister søkes løst gjennom
        forhandlinger. Dersom enighet ikke oppnås, behandles tvisten
        av Oslo tingrett som verneting.
      </p>

      <h2>11. Kontakt</h2>
      <ul>
        <li><strong>Generelle henvendelser:</strong> hei@suksess.no</li>
        <li><strong>Kontraktsspørsmål:</strong> kontrakt@suksess.no</li>
        <li><strong>Personvern:</strong> personvern@suksess.no</li>
        <li><strong>Teknisk support:</strong> support@suksess.no</li>
      </ul>

      <p className="text-sm text-muted-foreground mt-8">
        Versjon: {CURRENT_VERSION}. Oppdateres ved endringer i tjenesten
        eller gjeldende rett.
      </p>
    </main>
  );
}
