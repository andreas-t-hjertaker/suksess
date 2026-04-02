"use client";

/**
 * Samtykke-bekreftelsesside for foresatte (#106).
 *
 * Offentlig side som foresatt lander på etter å klikke samtykkelenke i e-post.
 * Leser `token` fra URL query params og verifiserer via Cloud Function.
 *
 * Mulige tilstander:
 * - Verifiserer token (loading)
 * - Samtykke godkjent (suksess)
 * - Token ugyldig eller utløpt (feil)
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";
import Link from "next/link";

type VerifyState = "loading" | "success" | "error" | "expired" | "missing";

export default function SamtykkeBekreftelsePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>(token ? "loading" : "missing");
  const [studentName, setStudentName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("missing");
      return;
    }
    verifyConsent(token);
  }, [token]);

  async function verifyConsent(consentToken: string) {
    setState("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_FUNCTIONS_URL || ""}/consent/verify/${consentToken}`
      );

      if (res.ok) {
        const data = await res.json();
        setStudentName(data.studentName || null);
        setState("success");
      } else if (res.status === 410) {
        setState("expired");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <main
      role="main"
      aria-label="Samtykke-bekreftelse"
      className="min-h-screen bg-background flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md">
        {state === "loading" && (
          <>
            <CardHeader className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
              <CardTitle>Verifiserer samtykke...</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Vennligst vent mens vi bekrefter samtykket ditt.
              </p>
            </CardContent>
          </>
        )}

        {state === "success" && (
          <>
            <CardHeader className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" aria-hidden="true" />
              <CardTitle className="text-green-700">Samtykke godkjent</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {studentName
                  ? `Du har godkjent at ${studentName} kan bruke Suksess karriereveiledning.`
                  : "Samtykket er registrert. Eleven kan nå bruke Suksess karriereveiledning."}
              </p>
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-left">
                <Shield className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-blue-800">
                  Du kan når som helst trekke samtykket tilbake via foresatt-portalen.
                  Logg inn for å se elevens overordnede fremdrift.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Logg inn som foresatt</Link>
              </Button>
            </CardContent>
          </>
        )}

        {state === "expired" && (
          <>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" aria-hidden="true" />
              <CardTitle className="text-amber-700">Lenken har utlopt</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Samtykkelenken var gyldig i 7 dager og har nå utlopt.
                Be eleven om å sende en ny forespørsel.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Gå til forsiden</Link>
              </Button>
            </CardContent>
          </>
        )}

        {state === "error" && (
          <>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" aria-hidden="true" />
              <CardTitle className="text-destructive">Ugyldig lenke</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Samtykkelenken er ugyldig eller har allerede blitt brukt.
                Kontakt eleven for å få tilsendt en ny lenke.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Gå til forsiden</Link>
              </Button>
            </CardContent>
          </>
        )}

        {state === "missing" && (
          <>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
              <CardTitle>Manglende token</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Ingen samtykketoken funnet. Bruk lenken du mottok på e-post.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Gå til forsiden</Link>
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
