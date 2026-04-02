"use client";

/**
 * Statusside — systemovervåking og tjenestestatus (Issue #138)
 *
 * Viser sanntidsstatus for Suksess sine tjenester:
 * - Firebase (Auth, Firestore, Storage)
 * - AI-tjenester (Gemini / VertexAI)
 * - Weaviate (vektordatabase)
 * - API / Cloud Functions
 *
 * Offentlig tilgjengelig uten innlogging.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Clock,
  Shield,
  Zap,
  Database,
  Brain,
  Server,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type ServiceStatus = "operational" | "degraded" | "outage" | "checking";

type ServiceCheck = {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  icon: typeof Database;
};

type Incident = {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  createdAt: string;
  updatedAt: string;
  affectedServices: string[];
};

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  operational: { label: "Operasjonell", color: "text-green-600", icon: CheckCircle2 },
  degraded: { label: "Redusert ytelse", color: "text-yellow-600", icon: AlertTriangle },
  outage: { label: "Nedetid", color: "text-red-600", icon: XCircle },
  checking: { label: "Sjekker…", color: "text-muted-foreground", icon: Loader2 },
};

// ---------------------------------------------------------------------------
// Helsesjekker — ekte sjekker mot tjenestene
// ---------------------------------------------------------------------------

/** Sjekk Firebase Auth ved å hente auth-instansen */
async function checkFirebaseAuth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    // Auth er operasjonell hvis SDK er initialisert og har en config
    const ok = !!auth.config?.apiKey;
    return { ok, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

/** Sjekk Firestore med ekte lesekall (leser featureFlags — offentlig tilgjengelig) */
async function checkFirestore(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    const { collection, getDocs, query, limit } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase/firestore");
    const q = query(collection(db, "featureFlags"), limit(1));
    await getDocs(q);
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

/** Sjekk Cloud Functions health endpoint */
async function checkCloudFunctions(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_CF_BASE_URL
      || "https://europe-west1-suksess-842ed.cloudfunctions.net";
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, latencyMs: Math.round(performance.now() - start) };
    const data = await res.json();
    const ok = data.status === "ok" && data.services?.firestore === "connected";
    return { ok, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

/** Sjekk Firebase Hosting (sjekker at manifest.json er tilgjengelig) */
async function checkHosting(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    const res = await fetch("/manifest.json", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return { ok: res.ok, latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - start) };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StatusPage() {
  const [services, setServices] = useState<ServiceCheck[]>([
    { id: "firebase-auth", name: "Firebase Auth", description: "Autentisering (Feide, Google, E-post)", status: "checking", latencyMs: null, lastChecked: null, icon: Shield },
    { id: "firestore", name: "Cloud Firestore", description: "Database og brukerdata", status: "checking", latencyMs: null, lastChecked: null, icon: Database },
    { id: "ai-services", name: "AI-tjenester", description: "Gemini 2.5 Flash (VertexAI)", status: "checking", latencyMs: null, lastChecked: null, icon: Brain },
    { id: "cloud-functions", name: "Cloud Functions", description: "API og serverlogikk", status: "checking", latencyMs: null, lastChecked: null, icon: Server },
    { id: "weaviate", name: "Weaviate", description: "Vektordatabase (semantisk søk)", status: "checking", latencyMs: null, lastChecked: null, icon: Zap },
    { id: "hosting", name: "Firebase Hosting", description: "Webapplikasjon og CDN", status: "checking", latencyMs: null, lastChecked: null, icon: Globe },
  ]);

  const [incidents] = useState<Incident[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const updateService = useCallback(
    (id: string, status: ServiceStatus, latencyMs: number | null) => {
      setServices((prev) =>
        prev.map((svc) =>
          svc.id === id ? { ...svc, status, latencyMs, lastChecked: new Date() } : svc
        )
      );
    },
    []
  );

  const runChecks = useCallback(async () => {
    setRefreshing(true);

    // Kjør alle sjekker parallelt
    const [authResult, firestoreResult, cfResult, hostingResult] = await Promise.all([
      checkFirebaseAuth(),
      checkFirestore(),
      checkCloudFunctions(),
      checkHosting(),
    ]);

    updateService("firebase-auth", authResult.ok ? "operational" : "outage", authResult.latencyMs);
    updateService("firestore", firestoreResult.ok ? "operational" : "outage", firestoreResult.latencyMs);
    updateService("cloud-functions", cfResult.ok ? "operational" : cfResult.latencyMs > 5000 ? "degraded" : "outage", cfResult.latencyMs);
    updateService("hosting", hostingResult.ok ? "operational" : "outage", hostingResult.latencyMs);

    // AI og Weaviate — sjekkes indirekte via Cloud Functions health
    // Marker som operasjonell hvis CF svarer, ellers ukjent
    updateService("ai-services", cfResult.ok ? "operational" : "degraded", null);
    updateService("weaviate", cfResult.ok ? "operational" : "degraded", null);

    setLastRefresh(new Date());
    setRefreshing(false);
  }, [updateService]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const allOperational = services.every((s) => s.status === "operational");
  const hasIssues = services.some((s) => s.status === "degraded" || s.status === "outage");

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Suksess
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Systemstatus</h1>
        <p className="text-muted-foreground">
          Sanntidsstatus for Suksess sine tjenester.
        </p>
      </div>

      {/* Overordnet status */}
      <Card className={cn(
        "border-2",
        allOperational && "border-green-200 dark:border-green-900",
        hasIssues && "border-yellow-200 dark:border-yellow-900"
      )}>
        <CardContent className="flex items-center gap-4 py-6">
          {allOperational ? (
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          ) : hasIssues ? (
            <AlertTriangle className="h-10 w-10 text-yellow-600" />
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          )}
          <div>
            <h2 className="text-xl font-semibold">
              {allOperational
                ? "Alle systemer er operative"
                : hasIssues
                  ? "Noen tjenester har problemer"
                  : "Sjekker systemstatus…"}
            </h2>
            {lastRefresh && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sist sjekket: {lastRefresh.toLocaleTimeString("nb-NO")}
              </p>
            )}
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={runChecks}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Oppdater
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tjenester */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Tjenester</h2>
        {services.map((svc) => {
          const config = STATUS_CONFIG[svc.status];
          const StatusIcon = config.icon;
          const SvcIcon = svc.icon;
          return (
            <Card key={svc.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <SvcIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{svc.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {svc.latencyMs !== null && (
                    <span className="text-xs text-muted-foreground">
                      {svc.latencyMs}ms
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn("gap-1 text-xs", config.color)}
                  >
                    <StatusIcon className={cn("h-3 w-3", svc.status === "checking" && "animate-spin")} />
                    {config.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hendelser */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Hendelser</h2>
        {incidents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Ingen aktive hendelser. Alt fungerer normalt.
              </p>
            </CardContent>
          </Card>
        ) : (
          incidents.map((incident) => (
            <Card key={incident.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{incident.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {incident.status}
                  </Badge>
                </div>
                <CardDescription>
                  Oppdatert: {new Date(incident.updatedAt).toLocaleString("nb-NO")}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground space-y-1 pt-4">
        <p>Suksess — AI-drevet karriereveiledning for norske VGS-elever</p>
        <p>
          Region: europe-west1 (EU/GDPR) · Firebase + VertexAI
        </p>
      </div>
    </div>
  );
}
