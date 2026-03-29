"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
          <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold font-display mb-1">Noe gikk galt</h1>
        <p className="text-sm text-muted-foreground mb-6">
          En uventet feil oppstod. Prøv å laste siden på nytt, eller gå tilbake til
          dashboard.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Prøv igjen</Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Gå til dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
