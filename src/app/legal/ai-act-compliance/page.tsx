import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EU AI Act — Samsvarserklæring",
  description:
    "Dokumentasjon av Suksess-plattformens samsvar med EU AI Act (forordning 2024/1689).",
  robots: { index: false },
};

export default function AiActCompliancePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-neutral dark:prose-invert">
      <h1>EU AI Act — Samsvarsdokumentasjon</h1>
      <p className="lead">
        Suksess-plattformen bruker kunstig intelligens (AI) til karriereveiledning
        for norske VGS-elever (15–19 år). Denne siden dokumenterer vårt samsvar med
        EU AI Act (forordning 2024/1689), som trer i kraft august 2026.
      </p>

      <h2>1. Risikokategorisering</h2>
      <p>
        I henhold til EU AI Act artikkel 6 og vedlegg III klassifiseres AI-systemer
        brukt i utdanning og yrkesopplæring som <strong>høyrisiko</strong> dersom de
        brukes til å bestemme tilgang til utdanning eller evaluere elevers resultater.
      </p>
      <p>
        Suksess AI-veileder gir <em>anbefalinger</em> om studievalg og karriereveier,
        men tar ikke bindende beslutninger om opptak, karaktersetting eller tilgang til
        utdanning. Plattformen er et støtteverktøy som supplerer — ikke erstatter —
        menneskelig rådgivning.
      </p>
      <p>
        Vi behandler likevel systemet som potensielt høyrisiko og følger kravene i
        kapittel 3 som en forsiktighetsforanstaltning, gitt at brukerne er mindreårige.
      </p>

      <h2>2. Transparenstiltak</h2>
      <h3>2.1 AI-merking</h3>
      <p>
        Alle svar fra AI-veilederen er tydelig merket med <em>«AI-generert»</em>-etikett.
        Brukeren kan aldri forveksle AI-generert innhold med menneskelig rådgivning.
      </p>

      <h3>2.2 Ansvarsfraskrivelse</h3>
      <p>
        Hver AI-melding i chatten viser en tekst som oppfordrer eleven til å
        snakke med en menneskelig rådgiver for viktige beslutninger.
      </p>

      <h3>2.3 Systemprompt</h3>
      <p>
        AI-modellen er instruert til å:
      </p>
      <ul>
        <li>Alltid være åpen om at den er en AI</li>
        <li>Anbefale menneskelig rådgiver for viktige valg</li>
        <li>Si fra når den er usikker eller mangler informasjon</li>
        <li>Forklare at anbefalinger er basert på mønstre i data</li>
      </ul>

      <h3>2.4 Feilrapportering</h3>
      <p>
        Brukere kan rapportere feilaktige AI-anbefalinger direkte fra chatten via
        «Rapporter feil»-knappen. Rapportene lagres i Firestore og gjennomgås
        regelmessig for kvalitetssikring.
      </p>

      <h2>3. Datastyring og personvern</h2>
      <h3>3.1 AI-beslutningslogg</h3>
      <p>
        Alle vesentlige AI-beslutninger (karrierematch, studieanbefalinger, CV-innhold,
        chatrespons) logges til en dedikert Firestore-samling med følgende felt:
      </p>
      <ul>
        <li><strong>Bruker-ID:</strong> Hashet med SHA-256 (ingen direkte PII)</li>
        <li><strong>Tidsstempel:</strong> Når beslutningen ble tatt</li>
        <li><strong>Beslutningstype:</strong> Kategorisering av AI-handlingen</li>
        <li><strong>Input/output-sammendrag:</strong> PII-strippet, maks 200 tegn</li>
        <li><strong>Modellversjon:</strong> Hvilken AI-modell som ble brukt</li>
        <li><strong>Sikkerhetsflagg:</strong> Eventuelle sikkerhetsvarsler</li>
      </ul>

      <h3>3.2 Dataminimering</h3>
      <p>
        Beslutningsloggen inneholder kun anonymiserte sammendrag. Personnummer,
        e-postadresser og telefonnumre fjernes automatisk før logging.
      </p>

      <h3>3.3 GDPR-samsvar</h3>
      <p>
        All databehandling skjer i henhold til GDPR. AI-modellen kjøres via
        VertexAI i <code>europe-west1</code> (Belgia) — data forlater ikke EØS.
        Se vår <a href="/legal/dpia">DPIA</a> og{" "}
        <a href="/legal/databehandleravtale">databehandleravtale</a> for detaljer.
      </p>

      <h2>4. Menneskelig overstyring</h2>
      <ul>
        <li>
          <strong>Rådgivertilgang:</strong> Skolens rådgivere har tilgang til et
          eget dashboard der de kan følge opp elever og overstyre AI-anbefalinger.
        </li>
        <li>
          <strong>Klagekanal:</strong> Elever kan rapportere feil i AI-svar
          direkte fra chatten. Rapportene gjennomgås av menneskelig personell.
        </li>
        <li>
          <strong>Ingen automatiserte beslutninger:</strong> AI-veilederen gir
          kun anbefalinger. Ingen beslutninger om opptak, karakterer eller tilgang
          tas automatisk av AI-systemet.
        </li>
      </ul>

      <h2>5. Teknisk robusthet</h2>
      <ul>
        <li>
          <strong>Sikkerhetsfiltre:</strong> Gemini-modellens innebygde
          sikkerhetsinnstillinger er aktivert for alle kategorier (hat, farlig
          innhold, seksuelt innhold, trakassering).
        </li>
        <li>
          <strong>PII-filtrering:</strong> Brukerinput filtreres for
          personopplysninger (personnummer, e-post, telefon) før det sendes til
          AI-modellen.
        </li>
        <li>
          <strong>Prompt-injeksjon:</strong> Deteksjon av forsøk på å manipulere
          AI-modellens instruksjoner.
        </li>
        <li>
          <strong>Krisedeteksjon:</strong> Meldinger som indikerer krise
          (selvskading, overgrep) fanges opp og besvares med henvisning til
          hjelperessurser — uten å gå via AI-modellen.
        </li>
        <li>
          <strong>Rate limiting:</strong> Begrensning av antall meldinger for å
          hindre misbruk.
        </li>
      </ul>

      <h2>6. Kontaktinformasjon</h2>
      <p>
        Spørsmål om AI-samsvar kan rettes til:
      </p>
      <ul>
        <li><strong>Leverandør:</strong> KETL / Suksess AS</li>
        <li><strong>E-post:</strong> personvern@suksess.no</li>
      </ul>

      <p className="text-sm text-muted-foreground mt-8">
        Versjon: 2026-03-31. Oppdateres ved endringer i AI-systemet eller regelverk.
      </p>
    </main>
  );
}
