"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60vh] px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold font-display mb-1">Noe gikk galt</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Det oppstod en feil i denne modulen. Prøv å laste inn på nytt.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Last inn på nytt</Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Tilbake til oversikten
        </Link>
      </div>
    </div>
  );
}
