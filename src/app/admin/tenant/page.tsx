"use client";

/**
 * Tenant-administrasjon — multi-tenant arkitektur og skoleisolasjon (issue #24)
 */

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showToast } from "@/lib/toast";
import {
  Building2,
  Plus,
  Shield,
  Users,
  Globe,
  Loader2,
  CheckCircle2,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type Tenant = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  maxStudents: number;
  plan: "pilot" | "school" | "municipality";
  createdAt: { toDate?: () => Date } | null;
  active: boolean;
};

const PLAN_LABELS: Record<Tenant["plan"], string> = {
  pilot: "Pilotskole (gratis)",
  school: "Skole",
  municipality: "Kommune",
};

const PLAN_COLORS: Record<Tenant["plan"], string> = {
  pilot: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  school: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  municipality: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TenantAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Skjema
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Tenant["plan"]>("pilot");
  const [maxStudents, setMaxStudents] = useState("100");

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "tenants"), orderBy("createdAt", "desc"))
      );
      setTenants(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tenant))
      );
    } catch {
      showToast.error("Kunne ikke laste tenanter");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim() || !email.trim()) {
      showToast.error("Fyll ut alle påkrevde felt");
      return;
    }
    setCreating(true);
    try {
      const tenantId = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      await setDoc(doc(db, "tenants", tenantId), {
        name: name.trim(),
        slug: tenantId,
        contactEmail: email.trim(),
        maxStudents: parseInt(maxStudents) || 100,
        plan,
        active: true,
        createdAt: serverTimestamp(),
        settings: {
          allowSelfRegistration: true,
          feideIntegration: false,
          customBranding: false,
        },
      });
      showToast.success(`Tenant «${name}» opprettet`);
      setName(""); setSlug(""); setEmail(""); setMaxStudents("100");
      setShowForm(false);
      await loadTenants();
    } catch {
      showToast.error("Opprettelse feilet");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tenant-administrasjon</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administrer skoler og kommuner som egne isolerte tenanter.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ny tenant
        </Button>
      </div>

      {/* Arkitektur-info */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm">
            <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Multi-tenant isolasjon</p>
              <p className="text-muted-foreground text-xs">
                Hver tenant har sin egen isolerte Firestore-namespace via <code>tenantId</code> custom claim.
                Bruker A kan aldri lese data fra Tenant B — håndheves i Firestore Security Rules.
                Rådgivere ser kun aggregerte, anonymiserte data fra sin tenant.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ny tenant-skjema */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opprett ny tenant</CardTitle>
            <CardDescription>Skole eller kommunal enhet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="tenant-name" className="text-sm font-medium">Skolenavn *</label>
                <Input
                  id="tenant-name"
                  placeholder="f.eks. Nydalen videregående skole"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tenant-slug" className="text-sm font-medium">Slug (tenant-ID) *</label>
                <Input
                  id="tenant-slug"
                  placeholder="nydalen-vgs"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tenant-email" className="text-sm font-medium">Kontakt-e-post *</label>
                <Input
                  id="tenant-email"
                  type="email"
                  placeholder="it@nydalen-vgs.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tenant-max-students" className="text-sm font-medium">Maks elever</label>
                <Input
                  id="tenant-max-students"
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label id="tenant-plan-label" className="text-sm font-medium">Plan</label>
              <div className="flex gap-2 flex-wrap">
                {(["pilot", "school", "municipality"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      plan === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                    aria-pressed={plan === p}
                  >
                    {PLAN_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Opprett tenant
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Avbryt</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant-liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">Ingen tenanter opprettet ennå.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => (
            <div key={t.id} className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  Maks {t.maxStudents}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" aria-hidden="true" />
                  {t.contactEmail}
                </span>
              </div>
              <Badge className={PLAN_COLORS[t.plan]}>{PLAN_LABELS[t.plan]}</Badge>
              {t.active ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" aria-label="Aktiv" />
              ) : (
                <Info className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Inaktiv" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Teknisk dokumentasjon */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Teknisk arkitektur</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong>Firestore-struktur:</strong> <code>tenants/{"{tenantId}"}/settings</code> · <code>users/{"{uid}"}</code> (tenantId som custom claim)</p>
          <p><strong>Isolasjon:</strong> Firestore Security Rules blokkerer krysslesing via <code>userTenantId() == resource.tenantId</code></p>
          <p><strong>Provisjonering:</strong> Ny tenant → sett <code>tenantId</code> custom claim via Firebase Admin SDK (Cloud Function)</p>
          <p><strong>Rådgivere:</strong> Ser kun brukere i sin tenant (iSameTenant-sjekk), kun aggregerte data</p>
        </CardContent>
      </Card>
    </div>
  );
}
