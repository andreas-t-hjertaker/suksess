"use client";

/**
 * Dokumenter — viser brukerens testresultater og genererte innsikter fra Firestore.
 * Erstatter mock-data med ekte data fra users/{uid}/testResults.
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Compass,
  Star,
  FileText,
  Search,
  Download,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { TestResultSchema } from "@/types/schemas";
import type { TestType } from "@/types/domain";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type TestResultRow = {
  id: string;
  testType: TestType;
  completedAt: Timestamp | null;
  scores: Record<string, number>;
};

const TEST_META: Record<TestType, { label: string; icon: typeof Brain; color: string }> = {
  big_five: {
    label: "Big Five personlighetstest",
    icon: Brain,
    color: "text-violet-500",
  },
  riasec: {
    label: "RIASEC interessetest",
    icon: Compass,
    color: "text-blue-500",
  },
  strengths: {
    label: "Styrketest",
    icon: Star,
    color: "text-amber-500",
  },
  learning_style: {
    label: "Læringstiltest",
    icon: FileText,
    color: "text-green-500",
  },
};

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleDateString("nb-NO", { year: "numeric", month: "short", day: "numeric" });
}

function exportRow(row: TestResultRow) {
  const data = {
    type: row.testType,
    completedAt: row.completedAt?.toDate().toISOString() ?? null,
    scores: row.scores,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${row.testType}_${row.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DokumenterPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<TestResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function fetchTestResults() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "users", user.uid, "testResults"),
        orderBy("completedAt", "desc")
      );
      const snap = await getDocs(q);
      const validated = snap.docs.reduce<TestResultRow[]>((acc, d) => {
        const result = TestResultSchema.safeParse(d.data());
        if (result.success) {
          acc.push({
            id: d.id,
            testType: result.data.testType,
            completedAt: d.data().completedAt ?? null,
            scores: result.data.scores,
          });
        } else {
          console.warn(`[Dokumenter] Valideringsfeil for ${d.ref.path}:`, result.error);
        }
        return acc;
      }, []);
      setRows(validated);
    } catch (err) {
      console.error("[Dokumenter] Feil ved henting av testresultater:", err);
      setError("Kunne ikke laste dokumenter. Prøv igjen senere.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTestResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      TEST_META[r.testType]?.label.toLowerCase().includes(q) ||
      r.testType.toLowerCase().includes(q)
    );
  });

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState message={error} onRetry={fetchTestResults} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumenter</h1>
          <p className="text-muted-foreground">
            Dine testresultater og registrerte dataer.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTestResults}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Oppdater
        </Button>
      </div>

      {/* Søk */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Søk i testresultater…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
          aria-label="Søk i testresultater"
        />
      </div>

      {/* Innhold */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium">
            {rows.length === 0 ? "Ingen testresultater funnet" : "Ingen resultater matcher søket"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {rows.length === 0
              ? "Fullfør onboarding og personlighetstester for å se resultater her."
              : "Prøv et annet søkeord."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const meta = TEST_META[row.testType] ?? {
              label: row.testType,
              icon: FileText,
              color: "text-muted-foreground",
            };
            const Icon = meta.icon;
            const topScores = Object.entries(row.scores ?? {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);

            return (
              <Card key={row.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-start gap-4 py-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted",
                      meta.color
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium text-sm">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(row.completedAt)}</p>
                    </div>

                    {topScores.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {topScores.map(([key, val]) => (
                          <Badge key={key} variant="secondary" className="text-[10px]">
                            {key}: {val}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => exportRow(row)}
                    title="Last ned som JSON"
                    aria-label="Last ned testresultat"
                    className="shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {rows.length} testresultat{rows.length !== 1 ? "er" : ""} totalt
      </p>
    </div>
  );
}
