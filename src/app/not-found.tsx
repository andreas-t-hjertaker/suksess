"use client";

import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useLocale } from "@/hooks/use-locale";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <EmptyState
        icon={MapPinOff}
        title={t.errors.pageNotFound}
        description={t.errors.pageNotFoundDesc}
        action={{ label: t.common.goToFrontpage, href: "/" }}
        secondaryAction={{ label: t.common.goToDashboard, href: "/dashboard" }}
      />
    </main>
  );
}
