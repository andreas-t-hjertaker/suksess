"use client";

import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <EmptyState
        icon={MapPinOff}
        title="Siden finnes ikke"
        description="Vi fant ikke siden du leter etter. Den kan ha blitt flyttet eller slettet."
        action={{ label: "Gå til forsiden", href: "/" }}
        secondaryAction={{ label: "Gå til dashboard", href: "/dashboard" }}
      />
    </main>
  );
}
