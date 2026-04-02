"use client";

import { useState, useEffect } from "react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { showToast } from "@/lib/toast";
import {
  Plus,
  Trash2,
  Loader2,
  Building2,
  Users,
  Percent,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type TenantSummary = { id: string; name: string };

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function FeatureFlagsPage() {
  const { flags, loading } = useFeatureFlags();
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);

  // Tenanter for tenant-velger
  const [tenants, setTenants] = useState<TenantSummary[]>([]);

  // Nytt flagg-skjema
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPlans, setNewPlans] = useState("");
  const [newTenantIds, setNewTenantIds] = useState<string[]>([]);
  const [newExcludedTenantIds, setNewExcludedTenantIds] = useState<string[]>([]);
  const [newRolloutPercentage, setNewRolloutPercentage] = useState("100");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, "tenants"), orderBy("name")))
      .then((snap) => {
        setTenants(
          snap.docs.map((d) => ({
            id: d.id,
            name: (d.data().name as string) || d.id,
          }))
        );
      })
      .catch(() => {});
  }, []);

  async function handleCreate() {
    if (!newKey || !newLabel) {
      showToast.error("Nøkkel og etikett er påkrevd");
      return;
    }
    setCreating(true);
    const res = await apiPost("/admin/feature-flags", {
      key: newKey,
      label: newLabel,
      description: newDescription || null,
      enabled: false,
      plans: newPlans ? newPlans.split(",").map((p) => p.trim()) : [],
      tenantIds: newTenantIds,
      excludedTenantIds: newExcludedTenantIds,
      rolloutPercentage: parseInt(newRolloutPercentage) || 100,
    });
    if (res.success) {
      showToast.success("Feature flag opprettet");
      setNewKey("");
      setNewLabel("");
      setNewDescription("");
      setNewPlans("");
      setNewTenantIds([]);
      setNewExcludedTenantIds([]);
      setNewRolloutPercentage("100");
      setShowForm(false);
    } else {
      showToast.error("Kunne ikke opprette feature flag");
    }
    setCreating(false);
  }

  async function handleToggle(id: string, enabled: boolean) {
    setActionLoading(id);
    const res = await apiPut(`/admin/feature-flags/${id}`, { enabled: !enabled });
    if (res.success) {
      showToast.success(enabled ? "Feature flag deaktivert" : "Feature flag aktivert");
    } else {
      showToast.error("Kunne ikke oppdatere feature flag");
    }
    setActionLoading(null);
  }

  async function handleUpdateTenantConfig(
    id: string,
    tenantIds: string[],
    excludedTenantIds: string[],
    rolloutPercentage: number
  ) {
    setActionLoading(id);
    const res = await apiPut(`/admin/feature-flags/${id}`, {
      tenantIds,
      excludedTenantIds,
      rolloutPercentage,
    });
    if (res.success) {
      showToast.success("Tenant-konfigurasjon oppdatert");
    } else {
      showToast.error("Kunne ikke oppdatere tenant-konfigurasjon");
    }
    setActionLoading(null);
  }

  async function handleDeleteFlag(id: string) {
    if (!confirm("Er du sikker på at du vil slette dette flagget?")) return;
    setActionLoading(id);
    const res = await apiDelete(`/admin/feature-flags/${id}`);
    if (res.success) {
      showToast.success("Feature flag slettet");
    } else {
      showToast.error("Kunne ikke slette feature flag");
    }
    setActionLoading(null);
  }

  function toggleTenantSelection(
    tenantId: string,
    selected: string[],
    setSelected: (ids: string[]) => void
  ) {
    if (selected.includes(tenantId)) {
      setSelected(selected.filter((t) => t !== tenantId));
    } else {
      setSelected([...selected, tenantId]);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature flags</h1>
          <p className="text-muted-foreground">
            Kontroller funksjoner per plan, tenant og utrullingsprosent.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt flagg
        </Button>
      </div>

      {/* Arkitektur-info */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm">
            <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Tenant-basert feature flags</p>
              <p className="text-muted-foreground text-xs">
                Feature flags kan begrenses til spesifikke tenanter (skoler/kommuner), planer
                og utrullingsprosent. Evalueringen kombinerer alle kriterier: plan-tilhørighet,
                tenant-inkludering/ekskludering, og gradvis utrulling via deterministisk hashing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Opprett feature flag</CardTitle>
            <CardDescription>
              Legg til et nytt funksjonsflagg med tenant- og planmålretting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flag-key">Nøkkel</Label>
                <Input
                  id="flag-key"
                  placeholder="f.eks. new_dashboard"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-label">Etikett</Label>
                <Input
                  id="flag-label"
                  placeholder="f.eks. Nytt dashboard"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-desc">Beskrivelse</Label>
              <Input
                id="flag-desc"
                placeholder="Kort beskrivelse av flagget"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flag-plans">Planer (kommaseparert, tomt = alle)</Label>
                <Input
                  id="flag-plans"
                  placeholder="f.eks. pro, school"
                  value={newPlans}
                  onChange={(e) => setNewPlans(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-rollout">Utrulling (%)</Label>
                <Input
                  id="flag-rollout"
                  type="number"
                  min={0}
                  max={100}
                  value={newRolloutPercentage}
                  onChange={(e) => setNewRolloutPercentage(e.target.value)}
                />
              </div>
            </div>

            {/* Tenant-velger: inkludert */}
            {tenants.length > 0 && (
              <div className="space-y-2">
                <Label>Begrens til tenanter (tomt = alle)</Label>
                <div className="flex flex-wrap gap-2">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        toggleTenantSelection(t.id, newTenantIds, setNewTenantIds)
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        newTenantIds.includes(t.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent"
                      }`}
                      aria-pressed={newTenantIds.includes(t.id)}
                    >
                      <Building2 className="mr-1 inline h-3 w-3" />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tenant-velger: ekskludert */}
            {tenants.length > 0 && (
              <div className="space-y-2">
                <Label>Ekskluder tenanter</Label>
                <div className="flex flex-wrap gap-2">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        toggleTenantSelection(
                          t.id,
                          newExcludedTenantIds,
                          setNewExcludedTenantIds
                        )
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        newExcludedTenantIds.includes(t.id)
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border hover:bg-accent"
                      }`}
                      aria-pressed={newExcludedTenantIds.includes(t.id)}
                    >
                      <Building2 className="mr-1 inline h-3 w-3" />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Opprett
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Avbryt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {flags.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Ingen feature flags opprettet ennå.
            </CardContent>
          </Card>
        ) : (
          flags.map((flag) => {
            const isExpanded = expandedFlag === flag.id;
            const hasTenantConfig =
              flag.tenantIds.length > 0 ||
              flag.excludedTenantIds.length > 0 ||
              flag.rolloutPercentage < 100;

            return (
              <Card key={flag.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{flag.label}</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {flag.key}
                        </code>
                        {flag.plans.length > 0 &&
                          flag.plans.map((plan) => (
                            <Badge key={plan} variant="outline">
                              {plan}
                            </Badge>
                          ))}
                        {flag.tenantIds.length > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {flag.tenantIds.length} tenant{flag.tenantIds.length > 1 ? "er" : ""}
                          </Badge>
                        )}
                        {flag.excludedTenantIds.length > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {flag.excludedTenantIds.length} ekskludert
                          </Badge>
                        )}
                        {flag.rolloutPercentage < 100 && (
                          <Badge variant="secondary" className="gap-1">
                            <Percent className="h-3 w-3" />
                            {flag.rolloutPercentage}%
                          </Badge>
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-xs text-muted-foreground">{flag.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasTenantConfig && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedFlag(isExpanded ? null : flag.id)
                          }
                          aria-label="Vis tenant-konfigurasjon"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant={flag.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggle(flag.id, flag.enabled)}
                        disabled={actionLoading === flag.id}
                      >
                        {actionLoading === flag.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : flag.enabled ? (
                          "Aktiv"
                        ) : (
                          "Inaktiv"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFlag(flag.id)}
                        disabled={actionLoading === flag.id}
                        aria-label={`Slett feature flag ${flag.label}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Utvidet tenant-konfigurasjon */}
                  {isExpanded && (
                    <TenantFlagConfig
                      flagId={flag.id}
                      tenantIds={flag.tenantIds}
                      excludedTenantIds={flag.excludedTenantIds}
                      rolloutPercentage={flag.rolloutPercentage}
                      allTenants={tenants}
                      saving={actionLoading === flag.id}
                      onSave={handleUpdateTenantConfig}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline tenant-konfigurasjon per flagg
// ---------------------------------------------------------------------------

function TenantFlagConfig({
  flagId,
  tenantIds: initialTenantIds,
  excludedTenantIds: initialExcluded,
  rolloutPercentage: initialRollout,
  allTenants,
  saving,
  onSave,
}: {
  flagId: string;
  tenantIds: string[];
  excludedTenantIds: string[];
  rolloutPercentage: number;
  allTenants: TenantSummary[];
  saving: boolean;
  onSave: (id: string, tenantIds: string[], excluded: string[], rollout: number) => void;
}) {
  const [tenantIds, setTenantIds] = useState(initialTenantIds);
  const [excluded, setExcluded] = useState(initialExcluded);
  const [rollout, setRollout] = useState(initialRollout);

  function toggle(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter((t) => t !== id) : [...list, id]);
  }

  const hasChanges =
    JSON.stringify(tenantIds) !== JSON.stringify(initialTenantIds) ||
    JSON.stringify(excluded) !== JSON.stringify(initialExcluded) ||
    rollout !== initialRollout;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Inkluderte tenanter
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {allTenants.length === 0 ? (
              <span className="text-xs text-muted-foreground">Ingen tenanter registrert</span>
            ) : (
              allTenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id, tenantIds, setTenantIds)}
                  className={`rounded border px-2 py-1 text-xs transition-colors ${
                    tenantIds.includes(t.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                  aria-pressed={tenantIds.includes(t.id)}
                >
                  {t.name}
                </button>
              ))
            )}
          </div>
          {tenantIds.length === 0 && (
            <p className="text-xs text-muted-foreground">Tomt = tilgjengelig for alle tenanter</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Users className="h-3 w-3" />
            Ekskluderte tenanter
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {allTenants.length === 0 ? (
              <span className="text-xs text-muted-foreground">Ingen tenanter registrert</span>
            ) : (
              allTenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id, excluded, setExcluded)}
                  className={`rounded border px-2 py-1 text-xs transition-colors ${
                    excluded.includes(t.id)
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border hover:bg-accent"
                  }`}
                  aria-pressed={excluded.includes(t.id)}
                >
                  {t.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Percent className="h-3 w-3" />
          Gradvis utrulling ({rollout}%)
        </Label>
        <input
          type="range"
          min={0}
          max={100}
          value={rollout}
          onChange={(e) => setRollout(parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0% — ingen</span>
          <span>100% — alle</span>
        </div>
      </div>

      {hasChanges && (
        <Button
          size="sm"
          onClick={() => onSave(flagId, tenantIds, excluded, rollout)}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Lagre endringer
        </Button>
      )}
    </div>
  );
}
