"use client";

/**
 * Admin: Lisens-administrasjon for skoler (Issue #32)
 *
 * Viser alle tenanter med abonnementsstatus fra `subscriptions`-kolleksjonen.
 * Admin kan starte prøveperiode, åpne Stripe-portal og tilbakekalle tilgang.
 */

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { fetchApi } from "@/lib/api-client";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast";
import { SCHOOL_TIERS, type SchoolTier } from "@/lib/stripe/pricing";
import { Loader2, ExternalLink, PlayCircle, XCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type SubscriptionStatus = "active" | "trialing" | "canceled" | "revoked" | "none";

type LicenseRow = {
  tenantId: string;
  plan: string;
  status: SubscriptionStatus;
  startDate: string;
  trialEnds: string;
  mrr: number;
  stripeCustomerId: string | null;
};

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

function planLabel(planId: string): string {
  if (planId in SCHOOL_TIERS) {
    return SCHOOL_TIERS[planId as SchoolTier].name;
  }
  return planId || "Ukjent";
}

function mrrFromPlan(planId: string): number {
  if (planId in SCHOOL_TIERS) {
    const yearlyPrice = SCHOOL_TIERS[planId as SchoolTier].prisPerAar;
    return Math.round(yearlyPrice / 12);
  }
  return 0;
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  canceled: "Avsluttet",
  revoked: "Tilbakekalt",
  none: "Ingen",
};

const STATUS_VARIANTS: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  trialing: "secondary",
  canceled: "outline",
  revoked: "destructive",
  none: "outline",
};

type FilterTab = "all" | "active" | "trialing" | "expired";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "active", label: "Aktive" },
  { key: "trialing", label: "Prøveperiode" },
  { key: "expired", label: "Utløpt" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LisenserAdminPage() {
  const [rows, setRows] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Hent alle tenanter
      const tenantSnap = await getDocs(
        query(collection(db, "tenants"), orderBy("createdAt", "desc"))
      );

      // Hent alle abonnementer
      const subSnap = await getDocs(collection(db, "subscriptions"));
      const subMap = new Map<string, Record<string, unknown>>();
      subSnap.docs.forEach((d) => subMap.set(d.id, d.data()));

      const result: LicenseRow[] = tenantSnap.docs.map((d) => {
        const tenant = d.data();
        const sub = subMap.get(d.id);
        const status: SubscriptionStatus = sub
          ? (sub.status as SubscriptionStatus)
          : "none";
        const plan = (sub?.plan ?? tenant.plan ?? "") as string;

        return {
          tenantId: d.id,
          plan,
          status,
          startDate: formatDate(sub?.startDate ?? sub?.created ?? null),
          trialEnds: formatDate(sub?.trialEnd ?? null),
          mrr: status === "active" || status === "trialing" ? mrrFromPlan(plan) : 0,
          stripeCustomerId: (sub?.stripeCustomerId ?? null) as string | null,
        };
      });

      setRows(result);
    } catch {
      showToast.error("Kunne ikke laste lisenser");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTrial(tenantId: string) {
    setActionLoading(tenantId + ":trial");
    try {
      const res = await fetchApi<{ url?: string }>("/stripe/school-checkout", {
        method: "POST",
        body: { tenantId, trial_period_days: 14 },
      });
      if (res.success) {
        showToast.success(`Prøveperiode startet for ${tenantId}`);
        await loadData();
      } else {
        showToast.error(res.error ?? "Feil ved oppstart av prøveperiode");
      }
    } catch {
      showToast.error("Noe gikk galt");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManageInStripe(tenantId: string) {
    setActionLoading(tenantId + ":portal");
    try {
      const res = await fetchApi<{ url: string }>("/stripe/portal", {
        method: "POST",
        body: { tenantId },
      });
      if (res.success && res.data.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        showToast.error("Kunne ikke åpne Stripe-portal");
      }
    } catch {
      showToast.error("Noe gikk galt");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevokeAccess(tenantId: string) {
    if (
      !window.confirm(
        `Er du sikker på at du vil tilbakekalle tilgangen for ${tenantId}?`
      )
    ) {
      return;
    }
    setActionLoading(tenantId + ":revoke");
    try {
      await updateDoc(doc(db, "subscriptions", tenantId), {
        status: "revoked",
      });
      showToast.success(`Tilgang tilbakekalt for ${tenantId}`);
      setRows((prev) =>
        prev.map((r) =>
          r.tenantId === tenantId ? { ...r, status: "revoked" } : r
        )
      );
    } catch {
      showToast.error("Kunne ikke tilbakekalle tilgang");
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "active") return r.status === "active";
    if (filter === "trialing") return r.status === "trialing";
    if (filter === "expired")
      return r.status === "canceled" || r.status === "revoked";
    return true;
  });

  const columns: ColumnDef<LicenseRow>[] = [
    {
      key: "tenantId",
      header: "Tenant ID",
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs">{String(val)}</span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      render: (val) => planLabel(String(val)),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (val) => {
        const s = val as SubscriptionStatus;
        return (
          <Badge variant={STATUS_VARIANTS[s]}>
            {STATUS_LABELS[s] ?? String(s)}
          </Badge>
        );
      },
    },
    {
      key: "startDate",
      header: "Startdato",
      render: (val) => String(val),
    },
    {
      key: "trialEnds",
      header: "Prøveperiode slutter",
      render: (val) => String(val),
    },
    {
      key: "mrr",
      header: "MRR (NOK)",
      sortable: true,
      render: (val) =>
        Number(val) > 0
          ? `${Number(val).toLocaleString("nb-NO")} kr`
          : "—",
    },
    {
      key: "tenantId",
      header: "Handlinger",
      render: (_val, row) => {
        const id = row.tenantId;
        const isTrialing = row.status === "trialing";
        const isActive = row.status === "active";
        const hasSubscription = isActive || isTrialing;

        return (
          <div className="flex items-center gap-2 flex-wrap">
            {!hasSubscription && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={actionLoading === id + ":trial"}
                onClick={() => handleStartTrial(id)}
              >
                {actionLoading === id + ":trial" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <PlayCircle className="h-3 w-3" />
                )}
                Start prøveperiode
              </Button>
            )}
            {hasSubscription && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={actionLoading === id + ":portal"}
                onClick={() => handleManageInStripe(id)}
              >
                {actionLoading === id + ":portal" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
                Administrer i Stripe
              </Button>
            )}
            {(isActive || isTrialing) && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 text-xs"
                disabled={actionLoading === id + ":revoke"}
                onClick={() => handleRevokeAccess(id)}
              >
                {actionLoading === id + ":revoke" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Tilbakekall
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overskrift */}
      <div>
        <h1 className="text-2xl font-bold">Lisenser</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Administrer skoleabonnementer og prøveperioder.
        </p>
      </div>

      {/* Filter-tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Innhold */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable<LicenseRow>
          data={filtered}
          columns={columns}
          searchable
          searchKey="tenantId"
          pageSize={20}
        />
      )}
    </div>
  );
}
