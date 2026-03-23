"use client";

/**
 * Foresatt-samtykke-side (Issue #38)
 *
 * Foresatte klikker på denne lenken fra e-posten de mottar.
 * URL-parameter: ?uid=<elevens Firebase UID>
 *
 * Siden viser informasjon om hva som behandles, og foresatt kan gi
 * eller nekte samtykke. Ved samtykke oppdateres Firestore.
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

type Stage = "loading" | "form" | "granted" | "denied" | "error" | "already_granted";

type ConsentDoc = {
  userId: string;
  parentEmail: string;
  parentName?: string | null;
  parentalConsentGiven: boolean;
};

export default function SamtykkePage() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  const [stage, setStage] = useState<Stage>("loading");
  const [studentName, setStudentName] = useState<string>("eleven");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid) {
      setStage("error");
      return;
    }

    (async () => {
      try {
        const consentSnap = await getDoc(
          doc(db, "users", uid, "consent", "parental")
        );

        if (!consentSnap.exists()) {
          setStage("error");
          return;
        }

        const data = consentSnap.data() as ConsentDoc;
        if (data.parentalConsentGiven) {
          setStage("already_granted");
          return;
        }

        // Hent elevens navn fra profil
        const profileSnap = await getDoc(doc(db, "profiles", uid));
        if (profileSnap.exists()) {
          const name = profileSnap.data()?.displayName as string | undefined;
          if (name) setStudentName(name);
        }

        setStage("form");
      } catch {
        setStage("error");
      }
    })();
  }, [uid]);

  async function handleConsent(given: boolean) {
    if (!uid) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "users", uid, "consent", "parental"), {
        parentalConsentGiven: given,
        parentalConsentAt: serverTimestamp(),
        consentCategories: given
          ? {
              personality_profiling: true,
              ai_conversation: true,
              behavioral_tracking: false,
              analytics: false,
              marketing: false,
            }
          : {},
      });
      setStage(given ? "granted" : "denied");
    } catch {
      setStage("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Suksess</h1>
          <p className="text-sm text-muted-foreground">
            Karriereveiledning for videregående elever
          </p>
        </div>

        {/* Laster */}
        {stage === "loading" && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Samtykkeskjema */}
        {stage === "form" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <CardTitle>Samtykke for {studentName}</CardTitle>
              </div>
              <CardDescription>
                {studentName} ønsker å bruke Suksess — en AI-assistert
                karriereveiledningsplattform for norske videregående elever.
                Siden {studentName} er under 16 år, trenger vi ditt samtykke.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm">
                  Vi vil behandle følgende opplysninger:
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Personlighetsprofil (Big Five og RIASEC-interesser)</li>
                  <li>Karakterer fra videregående (lagt inn av eleven)</li>
                  <li>Samtalehistorikk med AI-veileder</li>
                  <li>Bruksdata (innloggingstidspunkter)</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Data lagres i EU og deles aldri med tredjeparter for kommersielle formål.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                Rettslig grunnlag: Samtykke etter GDPR art. 6(1)(a) og
                personopplysningsloven § 4. Du kan trekke tilbake samtykket
                når som helst fra{" "}
                <Link
                  href="/personvern"
                  className="underline hover:text-foreground"
                  target="_blank"
                >
                  personvernsiden <ExternalLink className="h-3 w-3 inline" />
                </Link>
                .
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => handleConsent(true)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Gi samtykke
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleConsent(false)}
                  disabled={submitting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Nekte
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Samtykke gitt */}
        {stage === "granted" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div>
                <h2 className="text-xl font-semibold">Samtykke registrert!</h2>
                <p className="text-muted-foreground mt-1">
                  {studentName} kan nå bruke Suksess fullt ut.
                  Takk for at du tok deg tid til å lese gjennom og svare.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Samtykke nektet */}
        {stage === "denied" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <XCircle className="h-16 w-16 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold">Samtykke ikke gitt</h2>
                <p className="text-muted-foreground mt-1">
                  {studentName} vil ikke ha tilgang til avanserte funksjoner
                  som krever ditt samtykke. Eleven kan fortsatt se basisinnhold.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Du kan ombestemme deg når som helst ved å kontakte{" "}
                  <a
                    href="mailto:personvern@suksess.no"
                    className="underline"
                  >
                    personvern@suksess.no
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Allerede samtykket */}
        {stage === "already_granted" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div>
                <h2 className="text-xl font-semibold">Samtykke allerede gitt</h2>
                <p className="text-muted-foreground mt-1">
                  Du har allerede gitt samtykke for {studentName}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feil */}
        {stage === "error" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <XCircle className="h-16 w-16 text-destructive" />
              <div>
                <h2 className="text-xl font-semibold">Ugyldig lenke</h2>
                <p className="text-muted-foreground mt-1">
                  Lenken er ugyldig eller utløpt. Kontakt skolen eller{" "}
                  <a
                    href="mailto:personvern@suksess.no"
                    className="underline"
                  >
                    personvern@suksess.no
                  </a>{" "}
                  for hjelp.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
