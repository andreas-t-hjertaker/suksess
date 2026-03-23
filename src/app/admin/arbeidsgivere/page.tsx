"use client";

/**
 * Admin: Godkjenning av arbeidsgivere (Issue #71)
 *
 * Liste over alle arbeidsgivere (godkjente og ventende).
 * Admin kan godkjenne, avvise og deaktivere arbeidsgivere.
 */

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Building2, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employer } from "@/types/domain";

export default function AdminArbeidsgiverePage() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "employers"), orderBy("createdAt", "desc"))
      );
      setEmployers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employer)));
    } catch {
      setEmployers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function setGodkjent(id: string, value: boolean) {
    setUpdating(id);
    try {
      await updateDoc(doc(db, "employers", id), { godkjent: value });
      setEmployers((prev) =>
        prev.map((e) => (e.id === id ? { ...e, godkjent: value } : e))
      );
    } finally {
      setUpdating(null);
    }
  }

  const pending = employers.filter((e) => !e.godkjent);
  const approved = employers.filter((e) => e.godkjent);

  return (
    <main className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" aria-hidden="true" />
          Arbeidsgivere
        </h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} aria-hidden="true" />
          Oppdater
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-3" aria-hidden="true" />
          Laster…
        </div>
      ) : employers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Ingen arbeidsgivere er registrert ennå. Arbeidsgivere som registrerer seg
            via portalen vil vises her for godkjenning.
          </p>
        </Card>
      ) : (
        <>
          {/* Ventende */}
          {pending.length > 0 && (
            <section aria-labelledby="pending-heading">
              <h2 id="pending-heading" className="text-base font-semibold mb-3 flex items-center gap-2">
                Venter på godkjenning
                <Badge variant="destructive">{pending.length}</Badge>
              </h2>
              <div className="space-y-3">
                {pending.map((e) => (
                  <EmployerRow
                    key={e.id}
                    employer={e}
                    updating={updating === e.id}
                    onApprove={() => setGodkjent(e.id, true)}
                    onReject={() => setGodkjent(e.id, false)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Godkjente */}
          {approved.length > 0 && (
            <section aria-labelledby="approved-heading">
              <h2 id="approved-heading" className="text-base font-semibold mb-3 flex items-center gap-2">
                Godkjente arbeidsgivere
                <Badge variant="secondary">{approved.length}</Badge>
              </h2>
              <div className="space-y-3">
                {approved.map((e) => (
                  <EmployerRow
                    key={e.id}
                    employer={e}
                    updating={updating === e.id}
                    onApprove={() => setGodkjent(e.id, true)}
                    onReject={() => setGodkjent(e.id, false)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function EmployerRow({
  employer,
  updating,
  onApprove,
  onReject,
}: {
  employer: Employer;
  updating: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{employer.navn}</span>
            <Badge variant={employer.godkjent ? "secondary" : "outline"} className="text-xs">
              {employer.godkjent ? "Godkjent" : "Venter"}
            </Badge>
            <Badge variant="secondary" className="text-xs">{employer.bransje}</Badge>
            <span className="text-xs text-muted-foreground">{employer.fylke}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{employer.beskrivelse}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {employer.kontaktEpost && (
              <a href={`mailto:${employer.kontaktEpost}`} className="hover:underline">
                {employer.kontaktEpost}
              </a>
            )}
            {employer.nettside && (
              <a
                href={employer.nettside}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Nettside
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {!employer.godkjent && (
            <Button
              size="sm"
              variant="default"
              onClick={onApprove}
              disabled={updating}
              aria-label={`Godkjenn ${employer.navn}`}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="ml-1.5 hidden sm:inline">Godkjenn</span>
            </Button>
          )}
          {employer.godkjent && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={updating}
              aria-label={`Tilbakekall godkjenning for ${employer.navn}`}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="ml-1.5 hidden sm:inline">Tilbakekall</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
