"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useSubscription } from "@/hooks/use-subscription";
import { fetchApi } from "@/lib/api-client";
import { showToast } from "@/lib/toast";

/** Norske etiketter for abonnement-status */
const statusLabels: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  past_due: "Forfalt",
  canceled: "Kansellert",
  incomplete: "Ufullstendig",
  unpaid: "Ubetalt",
  paused: "Pauset",
  none: "Ingen",
};

export default function AbonnementPage() {
  const { subscription, loading, isActive, isPastDue } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  /** Åpne Stripe kundeportal */
  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetchApi<{ url: string }>("/stripe/portal", {
        method: "POST",
      });

      if (res.success && res.data.url) {
        window.location.href = res.data.url;
      } else if (!res.success) {
        showToast.error(res.error);
      }
    } catch {
      showToast.error("Kunne ikke åpne kundeportalen.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abonnement</h1>
        <p className="text-muted-foreground">
          Administrer ditt abonnement og fakturering.
        </p>
      </div>

      {/* Aktivt abonnement */}
      {subscription && subscription.status !== "none" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ditt abonnement
              </CardTitle>
              <Badge variant={isActive ? "default" : isPastDue ? "destructive" : "secondary"}>
                {statusLabels[subscription.status] ?? subscription.status}
              </Badge>
            </div>
            <CardDescription>
              {subscription.cancelAtPeriodEnd
                ? "Abonnementet avsluttes ved periodens slutt."
                : "Abonnementet fornyes automatisk."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            {subscription.currentPeriodEnd && (
              <p>
                <span className="text-muted-foreground">Neste fakturering: </span>
                {subscription.currentPeriodEnd.toLocaleDateString("nb-NO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </CardContent>

          <CardFooter>
            <Button
              onClick={openPortal}
              disabled={portalLoading}
              variant="outline"
            >
              {portalLoading ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Administrer i Stripe
            </Button>
          </CardFooter>
        </Card>
      ) : (
        /* Ingen abonnement */
        <Card>
          <CardHeader>
            <CardTitle>Ingen aktivt abonnement</CardTitle>
            <CardDescription>
              Du har for øyeblikket ingen betalt plan. Oppgrader for å få tilgang
              til flere funksjoner.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/pricing">
              <Button>Se priser og oppgrader</Button>
            </Link>
          </CardFooter>
        </Card>
      )}

      {/* Advarsel ved forfalt betaling */}
      {isPastDue && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Betalingsproblem</CardTitle>
            <CardDescription>
              Vi klarte ikke å belaste betalingsmetoden din. Oppdater
              betalingsinformasjonen for å beholde tilgangen.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={openPortal} disabled={portalLoading}>
              Oppdater betaling
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
