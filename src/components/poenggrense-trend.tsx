/**
 * Poenggrense-trend komponent (Issue #60)
 *
 * Viser historisk poenggrense-utvikling for et studieprogram.
 * Data hentes fra Firestore admissionHistory/ (populert av DBH-ingest).
 */

"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { collection, query, where, orderBy, getDocs, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase/config";

type PoenggrenseEntry = {
  year: number;
  quota: string;
  points: number;
};

interface PoenggrenseTrendProps {
  nusCode: string;
  snitt?: number; // Elevens karaktersnitt for sammenligning
}

export function PoenggrenseTrend({ nusCode, snitt }: PoenggrenseTrendProps) {
  const [data, setData] = useState<PoenggrenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nusCode) { setLoading(false); return; }

    const db = getFirestore(app);
    getDocs(
      query(
        collection(db, "admissionHistory"),
        where("nusCode", "==", nusCode),
        orderBy("year", "asc")
      )
    )
      .then((snap) => {
        setData(snap.docs.map((d) => d.data() as PoenggrenseEntry));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [nusCode]);

  if (loading) {
    return <div className="h-24 animate-pulse rounded bg-muted" />;
  }

  const ordinaer = data.filter((d) => d.quota.toLowerCase().includes("ordin"));
  const forste = data.filter((d) => d.quota.toLowerCase().includes("forste") || d.quota.toLowerCase().includes("første"));
  const latestOrdinaer = ordinaer.at(-1)?.points ?? null;
  const prevOrdinaer = ordinaer.at(-2)?.points ?? null;

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ingen poenggrense-historikk tilgjengelig for dette programmet.
      </p>
    );
  }

  const trend =
    latestOrdinaer && prevOrdinaer
      ? latestOrdinaer > prevOrdinaer
        ? "up"
        : latestOrdinaer < prevOrdinaer
        ? "down"
        : "flat"
      : "flat";

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-red-500" : trend === "down" ? "text-green-500" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Poenggrenser (historisk)</div>
        {latestOrdinaer && (
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            {latestOrdinaer.toFixed(1)} p ordinær {ordinaer.at(-1)?.year}
          </div>
        )}
      </div>

      {/* Enkel ASCII-lignende bar-graf */}
      <div className="space-y-1.5">
        {ordinaer.slice(-5).map((entry) => {
          const maxPoints = Math.max(...ordinaer.map((d) => d.points), 60);
          const widthPct = Math.round((entry.points / maxPoints) * 100);
          const isAboveSnitt = snitt != null && snitt >= entry.points;

          return (
            <div key={`${entry.year}-${entry.quota}`} className="flex items-center gap-2 text-xs">
              <span className="w-10 shrink-0 text-right text-muted-foreground">{entry.year}</span>
              <div className="flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className={`h-4 rounded-sm transition-all ${isAboveSnitt ? "bg-green-500" : "bg-blue-400"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-10 shrink-0 font-medium">{entry.points.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      {snitt != null && latestOrdinaer && (
        <p className={`text-xs ${snitt >= latestOrdinaer ? "text-green-600" : "text-amber-600"}`}>
          {snitt >= latestOrdinaer
            ? `Ditt snitt (${snitt.toFixed(1)}) er over grensen — du kvalifiserer!`
            : `Ditt snitt (${snitt.toFixed(1)}) er ${(latestOrdinaer - snitt).toFixed(1)} poeng under grensen.`}
        </p>
      )}

      <p className="text-xs text-muted-foreground">Kilde: DBH (hkdir.no)</p>
    </div>
  );
}
