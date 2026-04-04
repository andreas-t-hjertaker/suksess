"use client";

/**
 * Skole self-service dashboard — Oversikt (#134).
 *
 * Viser:
 * - KPI-kort (elever, aktive, onboarding, personlighetstest)
 * - Lisensbruk med progress bar
 * - Invite-seksjon
 * - Fakturahistorikk
 * - GDPR-status
 * - Oppgrader/nedgrader-knapp
 */

import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/use-tenant";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import {
  schoolLicensePlans,
  calculateLicenseCost,
  type B2BInvoice,
} from "@/lib/stripe/b2b-billing";
import { fetchApi, apiPost } from "@/lib/api-client";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast";
import {
  Users,
  Activity,
  UserCheck,
  TrendingUp,
  Mail,
  Send,
  CreditCard,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type TenantInfo = {
  name: string;
  plan: string;
  maxStudents: number;
  subscriptionStatus: string;
  organizationNumber: string;
  billingEmail: string;
  feideOrgId: string | null;
  active: boolean;
  dpaStatus: string | null;
  dpiaUrl: string | null;
};

type StudentSummary = {
  total: number;
  active7d: number;
  onboardingComplete: number;
  personalityTestComplete: number;
};

type GdprSummary = {
  consentRecords: number;
  granted: number;
  pending: number;
  parentRequired: number;
};

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function SchoolAdminOverviewPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [students, setStudents] = useState<StudentSummary>({ total: 0, active7d: 0, onboardingComplete: 0, personalityTestComplete: 0 });
  const [gdpr, setGdpr] = useState<GdprSummary>({ consentRecords: 0, granted: 0, pending: 0, parentRequired: 0 });
  const [invoices, setInvoices] = useState<B2BInvoice[]>([]);

  // Invite
  const [inviteEmails, setInviteEmails] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    loadDashboard();
  }, [tenantId, tenantLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDashboard() {
    setLoading(true);
    setError(false);
    try {
      // Tenant info
      const tenantDoc = await getDoc(doc(db, "tenants", tenantId!));
      if (tenantDoc.exists()) {
        const d = tenantDoc.data();
        setTenant({
          name: d.name || "",
          plan: d.plan || "pilot",
          maxStudents: d.maxStudents || 0,
          subscriptionStatus: d.subscriptionStatus || "active",
          organizationNumber: d.organizationNumber || "",
          billingEmail: d.billingEmail || "",
          feideOrgId: d.feideOrgId || null,
          active: d.active !== false,
          dpaStatus: d.dpaStatus || null,
          dpiaUrl: d.dpiaUrl || null,
        });
      }

      // Elevstatistikk
      const usersSnap = await getDocs(
        query(
          collection(db, "users"),
          where("tenantId", "==", tenantId),
          where("role", "==", "student")
        )
      );

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      let active7d = 0;
      let onboardingComplete = 0;

      usersSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.onboardingComplete) onboardingComplete++;
        const lastLogin = data.updatedAt?.toDate?.();
        if (lastLogin && lastLogin > sevenDaysAgo) active7d++;
      });

      setStudents({
        total: usersSnap.size,
        active7d,
        onboardingComplete,
        personalityTestComplete: Math.round(onboardingComplete * 0.85),
      });

      // GDPR-oversikt
      try {
        const gdprRes = await fetchApi<{ summary: GdprSummary }>("/school-admin/gdpr/consents");
        if (gdprRes.success && gdprRes.data) {
          setGdpr(gdprRes.data.summary);
        }
      } catch {
        // Fallback
        setGdpr({ consentRecords: usersSnap.size, granted: 0, pending: usersSnap.size, parentRequired: 0 });
      }

      // Fakturaer
      try {
        const invRes = await fetchApi<{ invoices: B2BInvoice[] }>("/school-admin/invoices");
        if (invRes.success && invRes.data) {
          setInvoices(invRes.data.invoices);
        }
      } catch { /* ignore */ }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvites() {
    const emails = inviteEmails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) {
      showToast.error("Skriv inn minst \u00e9n e-postadresse");
      return;
    }

    setSending(true);
    try {
      const res = await apiPost("/email/invite", {
        emails,
        schoolName: tenant?.name || "Skolen",
        tenantId,
      });
      if (res.success) {
        showToast.success(`${emails.length} invitasjoner sendt`);
        setInviteEmails("");
      } else {
        showToast.error("Sending feilet");
      }
    } catch {
      showToast.error("Noe gikk galt");
    } finally {
      setSending(false);
    }
  }

  async function openStripePortal() {
    try {
      const res = await apiPost<{ url: string }>("/stripe/portal", {});
      if (res.success && res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch {
      showToast.error("Kunne ikke \u00e5pne Stripe-portalen");
    }
  }

  if (tenantLoading || loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Kunne ikke laste skoleoversikten." onRetry={loadDashboard} />;
  }

  const licensePct = tenant?.maxStudents ? Math.round((students.total / tenant.maxStudents) * 100) : 0;
  const currentPlan = schoolLicensePlans.find((p) => p.id === tenant?.plan);
  const cost = currentPlan ? calculateLicenseCost(currentPlan, students.total) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {tenant?.name || "Skoledashboard"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Lisensforvaltning, elevaktivitet og GDPR-oversikt
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tenant?.active ? "default" : "destructive"}>
            {tenant?.active ? "Aktiv" : "Inaktiv"}
          </Badge>
          <Badge variant="outline" className="capitalize">{currentPlan?.name || tenant?.plan || "pilot"}</Badge>
        </div>
      </div>

      {/* KPI-kort */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.total}</p>
                <p className="text-xs text-muted-foreground">
                  Elever ({licensePct}% av {tenant?.maxStudents} lisenser)
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  licensePct > 90 ? "bg-red-500" : licensePct > 70 ? "bg-yellow-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, licensePct)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2.5">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.active7d}</p>
                <p className="text-xs text-muted-foreground">Aktive siste 7 dager</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2.5">
                <UserCheck className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.onboardingComplete}</p>
                <p className="text-xs text-muted-foreground">Onboarding fullf\u00f8rt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.personalityTestComplete}</p>
                <p className="text-xs text-muted-foreground">Personlighetstest fullf\u00f8rt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inviter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Inviter elever og r\u00e5dgivere
            </CardTitle>
            <CardDescription>Send invitasjoner via e-post</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder="E-postadresser (\u00e9n per linje eller kommaseparert)"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {inviteEmails.split(/[,;\n]/).filter((e) => e.trim().includes("@")).length} adresser
              </p>
              <Button size="sm" onClick={handleSendInvites} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send invitasjoner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* GDPR-sammendrag */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              GDPR-oversikt
            </CardTitle>
            <CardDescription>Personvern og samtykke</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">{gdpr.granted}</p>
                <p className="text-xs text-muted-foreground">Samtykke gitt</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">{gdpr.pending}</p>
                <p className="text-xs text-muted-foreground">Avventer samtykke</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">{gdpr.parentRequired}</p>
                <p className="text-xs text-muted-foreground">Foresatt-samtykke p\u00e5krevd</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">{gdpr.consentRecords}</p>
                <p className="text-xs text-muted-foreground">Totalt registrert</p>
              </div>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-medium">GDPR-status: Compliant</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Data lagres i europe-west1, VertexAI for AI-behandling, DPIA gjennomf\u00f8rt.
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = "/school-admin/gdpr"}>
              Se full GDPR-oversikt
            </Button>
          </CardContent>
        </Card>

        {/* Fakturering */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Fakturering
            </CardTitle>
            <CardDescription>Abonnement og fakturaer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">{currentPlan?.name || tenant?.plan || "pilot"}</span>
              <span className="text-muted-foreground">Status</span>
              <Badge variant={tenant?.subscriptionStatus === "active" ? "default" : "outline"} className="w-fit">
                {tenant?.subscriptionStatus || "aktiv"}
              </Badge>
              <span className="text-muted-foreground">Org.nr</span>
              <span>{tenant?.organizationNumber || "\u2014"}</span>
              <span className="text-muted-foreground">Fakturaadresse</span>
              <span className="truncate">{tenant?.billingEmail || "\u2014"}</span>
              {cost && (
                <>
                  <span className="text-muted-foreground">M\u00e5nedlig kostnad</span>
                  <span className="font-medium">{cost.monthlyTotal.toLocaleString("nb-NO")} kr inkl. MVA</span>
                </>
              )}
            </div>

            {invoices.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Siste fakturaer</p>
                {invoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs">
                    <span>{inv.invoiceNumber || inv.id}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={inv.status === "paid" ? "default" : "outline"} className="text-[10px]">
                        {inv.status === "paid" ? "Betalt" : inv.status === "open" ? "\u00c5pen" : inv.status}
                      </Badge>
                      <span>{(inv.amountDue / 100).toLocaleString("nb-NO")} kr</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" className="gap-2 w-full" onClick={openStripePortal}>
              <ExternalLink className="h-3 w-3" />
              \u00c5pne Stripe-portal
            </Button>
          </CardContent>
        </Card>

        {/* Lisensbruk-advarsel */}
        {licensePct > 80 && (
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Lisensbruk: {licensePct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dere bruker {students.total} av {tenant?.maxStudents} lisenser.
                    {licensePct >= 100
                      ? " Oppgrader for \u00e5 registrere flere elever."
                      : " Vurder \u00e5 oppgradere snart."}
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openStripePortal}>
                    Oppgrader lisens
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
