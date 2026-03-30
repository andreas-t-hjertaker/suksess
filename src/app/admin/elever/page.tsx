"use client";

/**
 * Rådgiverportal: Elevliste med frafallsrisiko og oppfølgingsbehov (#54)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  Users,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from "@/lib/risk/dropout-risk";
import type { DropoutRiskLevel } from "@/lib/risk/dropout-risk";

type StudentRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  lastLoginAt: Date | null;
  bigFiveCompleted: boolean;
  programfagSelected: boolean;
  clusterId: string | null;
  riskLevel: DropoutRiskLevel | null;
  riskScore: number | null;
};

const RISK_ICONS: Record<DropoutRiskLevel, React.ReactNode> = {
  high: <AlertTriangle className="h-3.5 w-3.5" />,
  medium: <Clock className="h-3.5 w-3.5" />,
  low: <CheckCircle className="h-3.5 w-3.5" />,
};

export default function ElevListePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<DropoutRiskLevel | "all">("all");

  const loadStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Hent brukere i samme tenant
      const tenantId = (user as { tenantId?: string })?.tenantId;
      const q = tenantId
        ? query(
            collection(db, "users"),
            where("tenantId", "==", tenantId),
            orderBy("lastLoginAt", "desc"),
            limit(200)
          )
        : query(collection(db, "users"), orderBy("lastLoginAt", "desc"), limit(200));

      const snap = await getDocs(q);
      const rows: StudentRow[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName ?? null,
          email: data.email ?? null,
          lastLoginAt: data.lastLoginAt?.toDate() ?? null,
          bigFiveCompleted: data.bigFiveCompleted ?? false,
          programfagSelected: data.programfagSelected ?? false,
          clusterId: data.clusterId ?? null,
          riskLevel: data.riskLevel ?? null,
          riskScore: data.riskScore ?? null,
        };
      });
      setStudents(rows);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(() => {
    let result = students;
    if (riskFilter !== "all") {
      result = result.filter((s) => s.riskLevel === riskFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.displayName?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [students, riskFilter, search]);

  const riskCounts = useMemo(() => ({
    high: students.filter((s) => s.riskLevel === "high").length,
    medium: students.filter((s) => s.riskLevel === "medium").length,
    low: students.filter((s) => s.riskLevel === "low").length,
    unknown: students.filter((s) => !s.riskLevel).length,
  }), [students]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Elevliste
          </h1>
          <p className="text-muted-foreground mt-1">
            {students.length} elever i din skole
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadStudents}>
          Oppdater
        </Button>
      </div>

      {/* Risiko-oversikt */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { key: "high" as const, label: "Høy risiko", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600" },
          { key: "medium" as const, label: "Moderat risiko", icon: <Clock className="h-4 w-4" />, color: "text-amber-600" },
          { key: "low" as const, label: "Lav risiko", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
          { key: "unknown" as const, label: "Ikke vurdert", icon: <TrendingDown className="h-4 w-4" />, color: "text-muted-foreground" },
        ] as const).map(({ key, label, icon, color }) => (
          <button
            key={key}
            onClick={() => setRiskFilter(key === "unknown" ? "all" : key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors hover:bg-muted/40",
              riskFilter === key && "border-primary bg-primary/5"
            )}
          >
            <div className={cn("flex items-center gap-1.5 mb-1", color)}>
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold">{riskCounts[key]}</div>
          </button>
        ))}
      </div>

      {/* Søk og filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk navn eller e-post…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={riskFilter === f ? "default" : "outline"}
              onClick={() => setRiskFilter(f)}
            >
              {f === "all" ? "Alle" : RISK_LEVEL_LABELS[f]}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabell */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Elev</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Sist aktiv</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Risiko</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Laster elever…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Ingen elever funnet
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.uid} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.displayName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {s.lastLoginAt
                      ? s.lastLoginAt.toLocaleDateString("nb-NO")
                      : "Aldri"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {s.bigFiveCompleted && (
                        <Badge variant="secondary" className="text-xs">Personlighet</Badge>
                      )}
                      {s.programfagSelected && (
                        <Badge variant="secondary" className="text-xs">Programfag</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.riskLevel ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                        RISK_LEVEL_COLORS[s.riskLevel]
                      )}>
                        {RISK_ICONS[s.riskLevel]}
                        {s.riskScore}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/elever/${s.uid}`}
                      className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Se profil for ${s.displayName ?? s.email}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Risiko-scores er kun synlige for autoriserte rådgivere med elevens samtykke.
        Data er lagret i henhold til GDPR og skolens databehandleravtale.
      </p>
    </div>
  );
}
