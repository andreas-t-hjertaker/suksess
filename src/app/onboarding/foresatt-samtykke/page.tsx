"use client";

/**
 * Foresatt-samtykke for elever under 16 år (Issue #38 + #39)
 *
 * Flyt:
 * 1. Eleven oppgir fødselsdato → under 16 → vises denne siden
 * 2. Eleven skriver inn foresattes e-post
 * 3. Cloud Function sender e-post med samtykke-lenke til foresatt
 * 4. Foresatt bekrefter via lenken → eleven får tilgang
 *
 * Inntil samtykke er gitt, har eleven kun tilgang til begrenset innhold.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Mail, Clock, Loader2, ArrowRight } from "lucide-react";

type Stage = "form" | "sent" | "waiting";

export default function ForesattSamtykkePage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [stage, setStage] = useState<Stage>("form");
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendRequest() {
    if (!firebaseUser || !parentEmail.includes("@")) {
      setError("Oppgi en gyldig e-postadresse for foresatte.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Lagre forespørselen om foresatt-samtykke
      await setDoc(doc(db, "users", firebaseUser.uid, "consent", "parental"), {
        userId: firebaseUser.uid,
        requiresParentalConsent: true,
        parentEmail,
        parentName: parentName || null,
        parentalConsentGiven: false,
        parentalConsentAt: null,
        consentVersion: "2026-03-01",
        consentCategories: {
          personality_profiling: false,
          ai_conversation: false,
          behavioral_tracking: false,
          analytics: false,
          marketing: false,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // TODO: Cloud Function trigger sender e-post til foresatt
      // (Firestore trigger på users/{userId}/consent/parental ved create)

      setStage("sent");
    } catch {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-8 shadow-sm space-y-6">

          {/* Form-steg */}
          {stage === "form" && (
            <>
              <div className="text-center space-y-3">
                <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                <h1 className="text-2xl font-bold">Foresatt-samtykke påkrevd</h1>
                <p className="text-muted-foreground text-sm">
                  Du er under 16 år. I henhold til GDPR (personopplysningsloven)
                  trenger vi godkjenning fra en foresatt for å behandle
                  personlighets- og interessedata.
                </p>
              </div>

              <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-1">
                <p className="font-medium">Hva foresatt godkjenner:</p>
                <ul className="text-muted-foreground space-y-1 mt-2">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    Lagring av personlighetstestresultater (Big Five, RIASEC)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    AI-drevet karriereveiledning via chat
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    Deling av anonymisert profil med skolens rådgiver
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="parent-email">
                    Foresattes e-postadresse <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="parent-email"
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="foresatt@eksempel.no"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="parent-name">Foresattes navn (valgfritt)</label>
                  <Input
                    id="parent-name"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Fornavn Etternavn"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleSendRequest}
                disabled={submitting || !parentEmail.includes("@")}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send samtykkeforespørsel
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Foresatt mottar en e-post med en lenke for å godkjenne.
                Du kan bruke Suksess med begrenset tilgang mens vi venter.
              </p>
            </>
          )}

          {/* Sendt-steg */}
          {stage === "sent" && (
            <div className="text-center space-y-4">
              <Mail className="mx-auto h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold">E-post sendt!</h2>
              <p className="text-muted-foreground text-sm">
                Vi har sendt en forespørsel til <strong>{parentEmail}</strong>.
                Foresatt må klikke på lenken i e-posten for å godkjenne.
              </p>
              <div className="rounded-lg bg-muted/40 p-4 text-sm text-left space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Hva skjer nå?
                </p>
                <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Foresatt sjekker innboksen og klikker godkjenningslenken</li>
                  <li>Du mottar varsel og får full tilgang til Suksess</li>
                  <li>Ventetid: vanligvis noen timer til 1 dag</li>
                </ol>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setStage("waiting")}>
                  Fortsett med begrenset tilgang
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStage("form")}
                >
                  Endre e-postadresse
                </Button>
              </div>
            </div>
          )}

          {/* Venter-steg */}
          {stage === "waiting" && (
            <div className="text-center space-y-4">
              <Clock className="mx-auto h-12 w-12 text-amber-500" />
              <h2 className="text-xl font-bold">Venter på foresatt-godkjenning</h2>
              <p className="text-muted-foreground text-sm">
                Du har begrenset tilgang inntil foresatt godkjenner.
                Følgende funksjoner er tilgjengelig nå:
              </p>
              <ul className="text-sm text-left space-y-2">
                {[
                  "Se karriereveier og studieprogram",
                  "Lese om utdanningsvalg",
                  "Bruke AI-chat (uten lagring)",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
                {[
                  "Personlighets- og interessetest",
                  "Lagre samtalehistorikk",
                  "Rådgiveroversikt",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Gå til dashbordet
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
