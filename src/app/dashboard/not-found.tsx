"use client";

import { Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function DashboardNotFound() {
  return (
    <EmptyState
      icon={Search}
      title="Siden finnes ikke"
      description="Vi fant ikke denne dashboard-siden. Prøv å navigere via menyen, eller bruk Cmd+K for å søke."
      action={{ label: "Gå til dashboard", href: "/dashboard" }}
      secondaryAction={{ label: "Mine karrierestier", href: "/dashboard/karriere" }}
      className="min-h-[60vh]"
    />
  );
}
