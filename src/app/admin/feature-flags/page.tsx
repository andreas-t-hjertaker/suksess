"use client";

import { useState } from "react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
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
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function FeatureFlagsPage() {
  const { flags, loading } = useFeatureFlags();
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Nytt flagg-skjema
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPlans, setNewPlans] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newKey || !newLabel) {
      showToast.error("Nøkkel og etikett er påkrevd");
      return;
    }
    setCreating(true);
    const res = await apiPost("/admin/feature-flags", {
      key: newKey,
      label: newLabel,
      description: newDescription,
      enabled: false,
      plans: newPlans ? newPlans.split(",").map((p) => p.trim()) : [],
    });
    if (res.success) {
      showToast.success("Feature flag opprettet");
      setNewKey("");
      setNewLabel("");
      setNewDescription("");
      setNewPlans("");
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
            Kontroller funksjoner og tilgjengelighet per plan.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Nytt flagg
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Opprett feature flag</CardTitle>
            <CardDescription>
              Legg til et nytt funksjonsflagg.
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
            <div className="space-y-2">
              <Label htmlFor="flag-plans">Planer (kommaseparert, tomt = alle)</Label>
              <Input
                id="flag-plans"
                placeholder="f.eks. pro, team"
                value={newPlans}
                onChange={(e) => setNewPlans(e.target.value)}
              />
            </div>
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
          flags.map((flag) => (
            <Card key={flag.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{flag.label}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {flag.key}
                    </code>
                    {flag.plans.length > 0 && (
                      <div className="flex gap-1">
                        {flag.plans.map((plan) => (
                          <Badge key={plan} variant="outline">
                            {plan}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
