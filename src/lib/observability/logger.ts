/**
 * Observability: strukturert logging og metrics (Issue #25)
 *
 * Laget for å logge:
 * - LLM-kall: tokens, latency, kostnad per kall
 * - Cache hit/miss rates
 * - Feil og anomalier
 * - Core Web Vitals (via reportWebVitals)
 *
 * I produksjon sendes logs til Cloud Logging (Firebase Functions + console.log).
 * På klient sendes critical events til Firestore-subcollection events/.
 */

import { doc, setDoc, collection } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LlmCallMetric = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  /** Estimert kostnad NOK */
  estimatedCostNok: number;
  latencyMs: number;
  cacheHit: boolean;
  feature: string;
  tenantId?: string;
  userId?: string;
};

export type CacheMetric = {
  layer: 1 | 2 | 3;
  hit: boolean;
  key: string;
  feature: string;
};

export type ErrorEvent = {
  message: string;
  stack?: string;
  context?: string;
  userId?: string;
  tenantId?: string;
};

type StructuredLog = {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Kostnad-estimater per token (Gemini Flash, USD → NOK)
// ---------------------------------------------------------------------------

const USD_TO_NOK = 10.5;
const GEMINI_FLASH_INPUT_COST_PER_1K = 0.000075 * USD_TO_NOK;
const GEMINI_FLASH_OUTPUT_COST_PER_1K = 0.0003 * USD_TO_NOK;

export function estimateGeminiFlashCost(
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens / 1000) * GEMINI_FLASH_INPUT_COST_PER_1K +
    (outputTokens / 1000) * GEMINI_FLASH_OUTPUT_COST_PER_1K
  );
}

// ---------------------------------------------------------------------------
// In-memory aggregat (session)
// ---------------------------------------------------------------------------

const SESSION_METRICS = {
  llmCalls: 0,
  llmTotalTokens: 0,
  llmTotalCostNok: 0,
  llmTotalLatencyMs: 0,
  cacheHits: { 1: 0, 2: 0, 3: 0 },
  cacheMisses: { 1: 0, 2: 0, 3: 0 },
  errors: 0,
};

export function getSessionMetrics() {
  return { ...SESSION_METRICS };
}

export function resetSessionMetrics() {
  SESSION_METRICS.llmCalls = 0;
  SESSION_METRICS.llmTotalTokens = 0;
  SESSION_METRICS.llmTotalCostNok = 0;
  SESSION_METRICS.llmTotalLatencyMs = 0;
  SESSION_METRICS.cacheHits = { 1: 0, 2: 0, 3: 0 };
  SESSION_METRICS.cacheMisses = { 1: 0, 2: 0, 3: 0 };
  SESSION_METRICS.errors = 0;
}

// ---------------------------------------------------------------------------
// Strukturert logging
// ---------------------------------------------------------------------------

function buildLog(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): StructuredLog {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(JSON.stringify(buildLog("debug", message, data)));
    }
  },

  info(message: string, data?: Record<string, unknown>) {
    console.info(JSON.stringify(buildLog("info", message, data)));
  },

  warn(message: string, data?: Record<string, unknown>) {
    console.warn(JSON.stringify(buildLog("warn", message, data)));
  },

  error(message: string, data?: Record<string, unknown>) {
    console.error(JSON.stringify(buildLog("error", message, data)));
    SESSION_METRICS.errors++;
  },
};

// ---------------------------------------------------------------------------
// LLM metrics
// ---------------------------------------------------------------------------

export function trackLlmCall(metric: LlmCallMetric): void {
  SESSION_METRICS.llmCalls++;
  SESSION_METRICS.llmTotalTokens += metric.promptTokens + metric.completionTokens;
  SESSION_METRICS.llmTotalCostNok += metric.estimatedCostNok;
  SESSION_METRICS.llmTotalLatencyMs += metric.latencyMs;

  logger.info("llm_call", {
    model: metric.model,
    tokens: metric.promptTokens + metric.completionTokens,
    costNok: metric.estimatedCostNok.toFixed(4),
    latencyMs: metric.latencyMs,
    cacheHit: metric.cacheHit,
    feature: metric.feature,
  });
}

// ---------------------------------------------------------------------------
// Cache metrics
// ---------------------------------------------------------------------------

export function trackCacheEvent(metric: CacheMetric): void {
  if (metric.hit) {
    SESSION_METRICS.cacheHits[metric.layer]++;
  } else {
    SESSION_METRICS.cacheMisses[metric.layer]++;
  }

  logger.debug(`cache_${metric.hit ? "hit" : "miss"}`, {
    layer: metric.layer,
    feature: metric.feature,
    key: metric.key.slice(0, 8),
  });
}

export function getCacheHitRate(layer: 1 | 2 | 3): number {
  const hits = SESSION_METRICS.cacheHits[layer];
  const misses = SESSION_METRICS.cacheMisses[layer];
  const total = hits + misses;
  return total > 0 ? hits / total : 0;
}

// ---------------------------------------------------------------------------
// Feillogging til Firestore (kun kritiske feil, klient-side)
// ---------------------------------------------------------------------------

let firestoreDb: ReturnType<typeof import("firebase/firestore").getFirestore> | null = null;

export function initObservabilityFirestore(
  db: ReturnType<typeof import("firebase/firestore").getFirestore>
) {
  firestoreDb = db;
}

export async function trackErrorToFirestore(
  event: ErrorEvent
): Promise<void> {
  logger.error(event.message, {
    context: event.context,
    userId: event.userId,
    stack: event.stack?.slice(0, 500),
  });

  if (!firestoreDb) return;

  try {
    const ref = doc(collection(firestoreDb, "errorLogs"));
    await setDoc(ref, {
      ...event,
      stack: event.stack?.slice(0, 1000) ?? null,
      createdAt: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });
  } catch {
    // Silently fail — logging skal aldri krasje appen
  }
}

// ---------------------------------------------------------------------------
// Anomali-sjekk (enkel terskel-basert)
// ---------------------------------------------------------------------------

export type AnomalyCheck = {
  type: "cost_spike" | "high_error_rate" | "cache_miss_rate";
  triggered: boolean;
  value: number;
  threshold: number;
  message: string;
};

export function checkAnomalies(): AnomalyCheck[] {
  const anomalies: AnomalyCheck[] = [];

  // Kostand over 5 NOK per session
  if (SESSION_METRICS.llmTotalCostNok > 5) {
    anomalies.push({
      type: "cost_spike",
      triggered: true,
      value: SESSION_METRICS.llmTotalCostNok,
      threshold: 5,
      message: `Høy LLM-kostnad: ${SESSION_METRICS.llmTotalCostNok.toFixed(2)} NOK`,
    });
  }

  // Mer enn 3 feil per session
  if (SESSION_METRICS.errors > 3) {
    anomalies.push({
      type: "high_error_rate",
      triggered: true,
      value: SESSION_METRICS.errors,
      threshold: 3,
      message: `Høy feilrate: ${SESSION_METRICS.errors} feil`,
    });
  }

  // Cache miss rate > 80% på L1
  const l1HitRate = getCacheHitRate(1);
  if (l1HitRate < 0.2 && SESSION_METRICS.cacheHits[1] + SESSION_METRICS.cacheMisses[1] > 5) {
    anomalies.push({
      type: "cache_miss_rate",
      triggered: true,
      value: 1 - l1HitRate,
      threshold: 0.8,
      message: `Lav L1 cache hit rate: ${(l1HitRate * 100).toFixed(0)}%`,
    });
  }

  return anomalies;
}
