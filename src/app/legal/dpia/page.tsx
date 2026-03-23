import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DPIA — Personvernkonsekvensvurdering",
  robots: { index: false },
};

export default function DpiaPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
      <h1>Personvernkonsekvensvurdering (DPIA)</h1>
      <p className="lead">
        Suksess-plattformen er underlagt krav om DPIA etter GDPR art. 35 og
        Datatilsynets obligatoriske DPIA-liste (behandling av personopplysninger
        for å evaluere læring, mestring og trivsel i skoler).
      </p>

      <h2>1. Behandlingens art og formål</h2>
      <p>
        Suksess AI-karriereveiledning behandler personopplysninger om norske
        videregående skoleelever (typisk 16–19 år) for å:
      </p>
      <ul>
        <li>Kartlegge personlighetstrekk (Big Five) og interesseprofil (RIASEC)</li>
        <li>Gi personaliserte anbefalinger om studievalg og karriereveier</li>
        <li>Identifisere elever med forhøyet frafallsrisiko</li>
        <li>Gi AI-drevet veiledning via chat</li>
      </ul>

      <h2>2. Nødvendighet og proporsjonalitet</h2>
      <p>
        Behandlingen er nødvendig for å oppfylle formålet. Personlighetstesting er
        kjernen i veiledningen — uten denne kan ikke plattformen gi meningsfull
        individualisert støtte. Innsamlet data minimeres i henhold til GDPR art. 5(1)(c).
      </p>

      <h2>3. Risikoer identifisert</h2>
      <table>
        <thead>
          <tr><th>Risiko</th><th>Sannsynlighet</th><th>Alvorlighet</th><th>Tiltak</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Uautorisert tilgang til elevers personlighetsprofil</td>
            <td>Lav</td>
            <td>Høy</td>
            <td>Firebase Security Rules, App Check, tenantId-isolasjon</td>
          </tr>
          <tr>
            <td>AI-generert innhold som skader elevens selvbilde</td>
            <td>Lav–moderat</td>
            <td>Moderat</td>
            <td>Veilederprinsipper, menneskelig overstyring, klagekanal</td>
          </tr>
          <tr>
            <td>Profildata brukt til formål utenfor veiledning</td>
            <td>Lav</td>
            <td>Høy</td>
            <td>DPA med skoler, forbud mot sekundærbruk, audit trail</td>
          </tr>
          <tr>
            <td>Dataoverføring utenfor EØS (AI-kall)</td>
            <td>Eliminert</td>
            <td>Høy</td>
            <td>VertexAI Backend europe-west1 (se #50)</td>
          </tr>
          <tr>
            <td>Manglende samtykke for mindreårige under 16</td>
            <td>Lav</td>
            <td>Høy</td>
            <td>Aldersverifisering ved onboarding, foresatt-samtykke (se #38)</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Tiltak og restrisiko</h2>
      <ul>
        <li>Alle data lagres i Firestore i <strong>europe-west1</strong> (Belgia)</li>
        <li>AI-kall via VertexAI Backend — data forlater ikke EØS</li>
        <li>Firebase App Check — kun autentiserte klienter kan nå API</li>
        <li>Multi-tenant isolasjon — skoler kan ikke se hverandres data</li>
        <li>GDPR-rettigheter implementert: innsyn, retting, sletting, portabilitet</li>
        <li>Risikovurderingen gjennomgås årlig eller ved vesentlige endringer</li>
      </ul>

      <h2>5. Konsultasjon</h2>
      <p>
        Dersom restrisiko fortsatt vurderes som høy etter implementerte tiltak,
        skal Datatilsynet konsulteres i forkant av behandlingsstart (GDPR art. 36).
        Plattformleverandøren anbefaler forhåndskonsultasjon med Datatilsynet
        gitt at behandlingen involverer mindreåriges sensitive profildata.
      </p>

      <h2>6. Behandlingsansvarlig og databehandler</h2>
      <ul>
        <li><strong>Behandlingsansvarlig:</strong> Den enkelte skole/fylkeskommune</li>
        <li><strong>Databehandler:</strong> Suksess AS (plattformleverandør)</li>
        <li><strong>Databehandleravtale:</strong> Inngås mellom skole og Suksess AS</li>
      </ul>

      <p className="text-sm text-muted-foreground mt-8">
        Versjon: 2026-03-01. Oppdateres ved endringer i behandling eller regelverk.
      </p>
    </main>
  );
}
