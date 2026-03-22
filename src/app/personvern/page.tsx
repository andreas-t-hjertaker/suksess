/**
 * Personvernerklæring for Suksess (issue #17 — GDPR-compliance)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Personvernerklæring",
  description: "Les om hvordan Suksess samler inn, lagrer og beskytter dine personopplysninger.",
};

export default function PersonvernPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbake til forsiden
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mb-2">Personvernerklæring</h1>
      <p className="text-muted-foreground mb-8">Sist oppdatert: mars 2026</p>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold mb-3">1. Behandlingsansvarlig</h2>
          <p>
            Suksess AS er behandlingsansvarlig for personopplysningene som behandles i forbindelse med
            bruk av Suksess-plattformen. Kontaktinformasjon:{" "}
            <a href="mailto:personvern@suksess.no" className="underline">personvern@suksess.no</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Hvilke opplysninger samler vi inn?</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Navn og e-postadresse (ved registrering)</li>
            <li>Personlighetsprofil (Big Five OCEAN, RIASEC-interesser)</li>
            <li>Karakterer fra videregående skole</li>
            <li>Samtalehistorikk med AI-veilederen</li>
            <li>Bruksdata (innloggingstidspunkter, XP-poeng)</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Vi samler <strong>ikke</strong> inn sensitiv personinformasjon som helseopplysninger,
            politisk ståsted eller religiøs overbevisning.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Formål og rettslig grunnlag</h2>
          <div className="space-y-3 text-muted-foreground">
            <p><strong>Levering av tjenesten:</strong> Behandlingen er nødvendig for å oppfylle avtalen med deg (GDPR art. 6(1)(b)).</p>
            <p><strong>Personalisering:</strong> Basert på ditt samtykke tilpasser vi anbefalinger og AI-veiledning til din profil (GDPR art. 6(1)(a)).</p>
            <p><strong>Statistikk og forbedring:</strong> Aggregerte, anonymiserte data brukes til produktforbedring — aldri på individnivå uten samtykke.</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Datalagring og sikkerhet</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>All data lagres hos Google Cloud Platform i EU (region: <code>europe-west1</code>)</li>
            <li>Data krypteres under overføring (TLS 1.3) og i hvile (AES-256)</li>
            <li>Tilgang til data er begrenset til autorisert personell</li>
            <li>Vi har inngått databehandleravtale med Google LLC</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Deling av data</h2>
          <p className="text-muted-foreground">
            Vi selger <strong>aldri</strong> dine personopplysninger til tredjeparter.
            Anonymisert statistikk kan deles med tilknyttede skoler (din rådgiver ser aggregerte
            klasse-innsikter — aldri individuelle profiler uten ditt samtykke).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Dine rettigheter</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { right: "Innsyn", desc: "Du kan be om en kopi av all data vi har om deg." },
              { right: "Retting", desc: "Du kan korrigere feilaktige opplysninger." },
              { right: "Sletting", desc: "Du kan kreve at vi sletter alle opplysninger om deg." },
              { right: "Dataportabilitet", desc: "Du kan laste ned dine data i JSON-format." },
              { right: "Begrensning", desc: "Du kan be om at behandlingen begrenses." },
              { right: "Innsigelse", desc: "Du kan protestere mot behandling basert på legitime interesser." },
            ].map((r) => (
              <div key={r.right} className="rounded-lg border p-3 space-y-1">
                <p className="font-semibold text-sm">{r.right}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-muted-foreground">
            Utøv rettighetene dine via{" "}
            <Link href="/dashboard/mine-data" className="underline">Mine data</Link>{" "}
            eller kontakt{" "}
            <a href="mailto:personvern@suksess.no" className="underline">personvern@suksess.no</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Oppbevaringsperiode</h2>
          <p className="text-muted-foreground">
            Data beholdes så lenge kontoen er aktiv. Inaktive kontoer (ingen innlogging på 2 år)
            varsles og slettes automatisk etter 90 dager. Du kan slette kontoen din når som helst
            via <Link href="/dashboard/mine-data" className="underline">Mine data</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Klageadgang</h2>
          <p className="text-muted-foreground">
            Har du klager på vår behandling av personopplysninger, kan du henvende deg til{" "}
            <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" className="underline">
              Datatilsynet
            </a>{" "}
            (datatilsynet.no).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
          <p className="text-muted-foreground">
            Vi bruker kun nødvendige cookies for innlogging (session-token). Vi bruker ingen
            sporings- eller analysecookies uten ditt eksplisitte samtykke.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">10. Kontakt</h2>
          <p className="text-muted-foreground">
            Spørsmål om personvern? Kontakt oss på{" "}
            <a href="mailto:personvern@suksess.no" className="underline">personvern@suksess.no</a>{" "}
            eller post: Suksess AS, Postboks 1234, 0101 Oslo.
          </p>
        </section>

      </div>
    </div>
  );
}
