"use client";

/**
 * Skole self-service — GDPR-oversikt (#134).
 *
 * Funksjoner:
 * - Samtykke-tabell per elev med status, kategorier, foresatt-info
 * - DBA-status og DPIA-link
 * - Slett elev-data (GDPR Art. 17)
 * - Behandlingsprotokoll (Art. 30)
 * - Eksporter samtykkeoversikt som CSV
 */

import { useState, useEffect, useMemo } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { fetchApi, apiPost, apiDelete } from "@/lib/api-client";
import { CONSENT_CATEGORIES, type ConsentCategory } from "@/lib/gdpr/minor-consent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/toast";
import {
  Shield,
  Search,
  Download,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserX,
  Loader2,
  ExternalLink,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type ConsentEntry = {
  uid: string;
  displayName: string | null;
  email: string | null;
  status: string;
  categories: string[];
  ageCategory: string;
  parentEmail: string | null;
  grantedAt: string | null;
};

type ConsentSummary = {
  total: number;
  granted: number;
  pending: number;
  parentRequired: number;
  denied: number;
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  granted: { label: "Samtykke gitt", icon: CheckCircle2, color: "text-green-600" },
  pending: { label: "Avventer", icon: Clock, color: "text-yellow-600" },
  parent_required: { label: "Foresatt påkrevd", icon: AlertTriangle, color: "text-orange-600" },
  denied: { label: "Nektet", icon: UserX, color: "text-red-600" },
};

// ---------------------------------------------------------------------------
// Behandlingsprotokoll (Art. 30)
// ---------------------------------------------------------------------------

const TREATMENT_PROTOCOL = [
  { category: "Personlighetsprofil (Big Five + RIASEC)", purpose: "Karriereveiledning", legal: "Samtykke (Art. 6(1)(a))", retention: "Til konto slettes" },
  { category: "AI-samtaler", purpose: "Personlig veiledning", legal: "Samtykke (Art. 6(1)(a))", retention: "Til konto slettes" },
  { category: "Karakterer", purpose: "Poengberegning", legal: "Samtykke (Art. 6(1)(a))", retention: "Til konto slettes" },
  { category: "Atferdsdata (klikk/scroll)", purpose: "Forbedre anbefalinger", legal: "Samtykke (Art. 6(1)(a))", retention: "12 måneder" },
  { category: "Anonymisert statistikk", purpose: "Plattformforbedring", legal: "Berettiget interesse (Art. 6(1)(f))", retention: "Aggregert, ikke persondata" },
  { category: "Kontodata (navn, e-post)", purpose: "Brukeradministrasjon", legal: "Avtale (Art. 6(1)(b))", retention: "Til konto slettes" },
];

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function SchoolAdminGdprPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentEntry[]>([]);
  const [summary, setSummary] = useState<ConsentSummary>({ total: 0, granted: 0, pending: 0, parentRequired: 0, denied: 0 });
  const [tenantInfo, setTenantInfo] = useState<{ dpaStatus: string | null; dpiaUrl: string | null }>({ dpaStatus: null, dpiaUrl: null });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tab, setTab] = useState<"samtykke" | "protokoll">("samtykke");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (tenantLoading || !tenantId) return;
    loadData();
  }, [tenantId, tenantLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    try {
      // Samtykke-data
      const res = await fetchApi<{ consents: ConsentEntry[]; summary: ConsentSummary }>("/school-admin/gdpr/consents");
      if (res.success && res.data) {
        setConsents(res.data.consents);
        setSummary(res.data.summary);
      }

      // Tenant-info for DPA/DPIA
      const tenantDoc = await getDoc(doc(db, "tenants", tenantId!));
      if (tenantDoc.exists()) {
        const d = tenantDoc.data();
        setTenantInfo({
          dpaStatus: d.dpaStatus || null,
          dpiaUrl: d.dpiaUrl || null,
        });
      }
    } catch (err) {
      console.error("[SchoolAdminGDPR]", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await apiPost("/school-admin/gdpr/export", {});
      if (res.success) {
        showToast.success("CSV-eksport lastet ned");
      }
    } catch {
      // Fallback: bygg CSV lokalt
      const rows = ["Navn,E-post,Status,Kategorier,Alder,Foresatt-epost,Samtykke-dato"];
      for (const c of consents) {
        rows.push([
          `"${c.displayName || ""}"`,
          c.email || "",
          c.status,
          `"${c.categories.join(", ")}"`,
          c.ageCategory,
          c.parentEmail || "",
          c.grantedAt || "",
        ].join(","));
      }
      const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-samtykke-${tenantId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteUser(uid: string) {
    try {
      const res = await apiDelete(`/school-admin/users/${uid}`);
      if (res.success) {
        setConsents((prev) => prev.filter((c) => c.uid !== uid));
        showToast.success("All brukerdata slettet (GDPR Art. 17)");
        setConfirmDelete(null);
      }
    } catch {
      showToast.error("Sletting feilet");
    }
  }

  const filtered = useMemo(() => {
    let list = consents;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.displayName?.toLowerCase().includes(q)) ||
          (c.email?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [consents, statusFilter, search]);

  if (tenantLoading || loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            GDPR-oversikt
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personvern, samtykke og databehandling
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Eksporter CSV
        </Button>
      </div>

      {/* Sammendrag-kort */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Totalt", value: summary.total, color: "text-foreground" },
          { label: "Samtykke gitt", value: summary.granted, color: "text-green-600" },
          { label: "Avventer", value: summary.pending, color: "text-yellow-600" },
          { label: "Foresatt påkrevd", value: summary.parentRequired, color: "text-orange-600" },
          { label: "Nektet", value: summary.denied, color: "text-red-600" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={cn("text-2xl font-bold", item.color)}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DPA + DPIA */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Databehandleravtale (DBA)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tenantInfo.dpaStatus === "signed"
                    ? "Signert og aktiv"
                    : tenantInfo.dpaStatus === "pending"
                      ? "Avventer signering"
                      : "Ikke opprettet — kontakt support"}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "ml-auto text-xs",
                  tenantInfo.dpaStatus === "signed" ? "text-green-600" : "text-yellow-600"
                )}
              >
                {tenantInfo.dpaStatus === "signed" ? "Aktiv" : "Mangler"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ScrollText className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">DPIA (Data Protection Impact Assessment)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tenantInfo.dpiaUrl ? "Gjennomført — se dokument" : "Gjennomført av Suksess AS"}
                </p>
              </div>
              {tenantInfo.dpiaUrl && (
                <Button variant="ghost" size="icon" className="ml-auto" onClick={() => window.open(tenantInfo.dpiaUrl!, "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {([
          { id: "samtykke", label: "Samtykke per elev" },
          { id: "protokoll", label: "Behandlingsprotokoll (Art. 30)" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "samtykke" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk elev..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {["all", "granted", "pending", "parent_required", "denied"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "Alle" : STATUS_CONFIG[s]?.label || s}
                </Button>
              ))}
            </div>
          </div>

          {/* Tabell */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">Elev</th>
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Kategorier</th>
                  <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Alder</th>
                  <th className="text-right px-4 py-2 font-medium">Handling</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={c.uid} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.displayName || "Uten navn"}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                        {c.parentEmail && (
                          <p className="text-[10px] text-orange-600">Foresatt: {c.parentEmail}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className={cn("flex items-center gap-1.5 text-xs", statusCfg.color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusCfg.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {c.categories.map((cat) => (
                            <Badge key={cat} variant="outline" className="text-[10px]">
                              {CONSENT_CATEGORIES[cat as ConsentCategory]?.label || cat}
                            </Badge>
                          ))}
                          {c.categories.length === 0 && (
                            <span className="text-xs text-muted-foreground">Ingen</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px]">
                          {c.ageCategory === "under16" ? "Under 16" : c.ageCategory === "16plus" ? "16+" : "Ukjent"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {confirmDelete === c.uid ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(c.uid)} className="text-xs gap-1">
                              <Trash2 className="h-3 w-3" /> Slett
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)} className="text-xs">
                              Avbryt
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => setConfirmDelete(c.uid)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Slett data
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Ingen elever funnet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "protokoll" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Behandlingsprotokoll (GDPR Art. 30)</CardTitle>
            <CardDescription>
              Oversikt over alle kategorier av personopplysninger som behandles av Suksess-plattformen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium">Datakategori</th>
                    <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Formål</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Rettslig grunnlag</th>
                    <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Oppbevaringstid</th>
                  </tr>
                </thead>
                <tbody>
                  {TREATMENT_PROTOCOL.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{row.category}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{row.purpose}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{row.legal}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{row.retention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Tilleggsinformasjon</p>
              <p>Behandlingsansvarlig: Suksess AS / Skolen (felles behandlingsansvar)</p>
              <p>Databehandler: Google Cloud (Firebase, europe-west1)</p>
              <p>Overføring til tredjeland: Nei (all data i EU/EØS)</p>
              <p>Tekniske tiltak: Kryptering i transit (TLS 1.3) og hvile (AES-256), App Check, CSP</p>
              <p>Organisatoriske tiltak: Rollebasert tilgang, audit-logg, DPIA gjennomført</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
