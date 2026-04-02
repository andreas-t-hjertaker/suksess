"use client";

/**
 * Admin feedback-dashboard — viser aggregert bruker-feedback på AI-svar.
 * Firestore collection: chatFeedback/{feedbackId}
 * Issue #105
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { ChatFeedbackSchema } from "@/types/schemas";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type FeedbackRow = {
  id: string;
  userId: string;
  rating: "thumbs_up" | "thumbs_down";
  reason: string | null;
  messageContent: string;
  createdAt: Date | null;
};

const REASON_LABELS: Record<string, string> = {
  wrong_info: "Feil informasjon",
  not_relevant: "Ikke relevant",
  unclear: "Uforstatelig",
  other: "Annet",
};

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export default function FeedbackDashboard() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "thumbs_up" | "thumbs_down">("all");

  async function fetchFeedback() {
    setLoading(true);
    try {
      const q = query(
        collection(db, "chatFeedback"),
        orderBy("createdAt", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
      const rows = snap.docs.reduce<FeedbackRow[]>((acc, d) => {
        const result = ChatFeedbackSchema.safeParse(d.data());
        if (result.success) {
          const data = result.data;
          acc.push({
            id: d.id,
            userId: data.userId,
            rating: data.rating,
            reason: data.reason,
            messageContent: data.messageContent,
            createdAt: (data.createdAt as { toDate?: () => Date } | null)?.toDate?.() ?? null,
          });
        }
        return acc;
      }, []);
      setFeedback(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeedback();
  }, []);

  // Aggregerte tall
  const stats = useMemo(() => {
    const total = feedback.length;
    const positive = feedback.filter((f) => f.rating === "thumbs_up").length;
    const negative = feedback.filter((f) => f.rating === "thumbs_down").length;
    const ratio = total > 0 ? Math.round((positive / total) * 100) : 0;

    // Vanligste negative begrunnelser
    const reasonCounts: Record<string, number> = {};
    feedback
      .filter((f) => f.rating === "thumbs_down" && f.reason)
      .forEach((f) => {
        reasonCounts[f.reason!] = (reasonCounts[f.reason!] ?? 0) + 1;
      });

    // Siste 7 dager
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = feedback.filter((f) => f.createdAt && f.createdAt >= weekAgo);
    const weekPositive = thisWeek.filter((f) => f.rating === "thumbs_up").length;
    const weekRatio = thisWeek.length > 0 ? Math.round((weekPositive / thisWeek.length) * 100) : 0;

    return { total, positive, negative, ratio, reasonCounts, weekRatio, weekTotal: thisWeek.length };
  }, [feedback]);

  const filtered = useMemo(() => {
    if (filter === "all") return feedback;
    return feedback.filter((f) => f.rating === filter);
  }, [feedback, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">AI Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Bruker-feedback på AI-svar og karriereanbefalinger
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeedback} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Oppdater
        </Button>
      </div>

      {/* Oversiktskort */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.total}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.ratio}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.positive} positive / {stats.negative} negative
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denne uken</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.weekRatio}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats.weekTotal} svar denne uken
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vanligste problem</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                {Object.entries(stats.reasonCounts).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(stats.reasonCounts)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([reason, count]) => (
                        <div key={reason} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{REASON_LABELS[reason] ?? reason}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ingen negative enda</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter + liste */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Nylig feedback</CardTitle>
            <div className="flex gap-1">
              {(["all", "thumbs_up", "thumbs_down"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "Alle" : f === "thumbs_up" ? "Positive" : "Negative"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ingen feedback funnet.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, 50).map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <div className="mt-0.5">
                    {f.rating === "thumbs_up" ? (
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">
                      {f.messageContent || "(tomt innhold)"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {f.reason && (
                        <Badge variant="outline" className="text-xs">
                          {REASON_LABELS[f.reason] ?? f.reason}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {f.createdAt?.toLocaleDateString("nb-NO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) ?? "Ukjent dato"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
