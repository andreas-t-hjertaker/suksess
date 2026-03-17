"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { plans } from "@/lib/stripe/pricing";
import { fetchApi } from "@/lib/api-client";
import { showToast } from "@/lib/toast";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  /** Start Stripe Checkout for en betalt plan */
  async function handleSelectPlan(priceId: string, planId: string) {
    if (!priceId || priceId === "") return;

    setLoadingPlan(planId);
    try {
      const res = await fetchApi<{ url: string }>("/stripe/checkout", {
        method: "POST",
        body: { priceId },
      });

      if (res.success && res.data.url) {
        window.location.href = res.data.url;
      } else if (!res.success) {
        showToast.error(res.error);
      }
    } catch {
      showToast.error("Noe gikk galt. Prøv igjen senere.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Topplinje */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Priser</h1>
        </div>
      </header>

      {/* Prisplaner */}
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Velg planen som passer deg
          </h2>
          <p className="mt-2 text-muted-foreground">
            Start gratis, oppgrader når du trenger mer.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.highlighted && "ring-2 ring-primary"
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Mest populær
                </Badge>
              )}

              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? "Gratis" : `${plan.price} kr`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">
                      /{plan.interval === "month" ? "mnd" : "år"}
                    </span>
                  )}
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {plan.price === 0 ? (
                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full">
                      Kom i gang
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full"
                    disabled={loadingPlan === plan.id}
                    onClick={() => handleSelectPlan(plan.stripePriceId, plan.id)}
                  >
                    {loadingPlan === plan.id ? "Laster..." : "Velg plan"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
