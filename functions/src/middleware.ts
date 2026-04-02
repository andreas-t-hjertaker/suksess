import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { z, type ZodSchema } from "zod";

// ============================================================
// Typed response-hjelpere
// ============================================================

export function success<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}

export function fail(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, error: message });
}

// ============================================================
// Typer for rute-handlers
// ============================================================

/** Kontekst som sendes til alle handlers */
export type RouteContext = {
  req: Request;
  res: Response;
};

/** Kontekst for autentiserte handlers */
export type AuthenticatedContext = RouteContext & {
  user: DecodedIdToken;
};

/** Kontekst for validerte handlers */
export type ValidatedContext<T> = AuthenticatedContext & {
  data: T;
};

/** Enkel handler uten auth */
type PublicHandler = (ctx: RouteContext) => Promise<void> | void;

/** Handler med autentisert bruker */
type AuthHandler = (ctx: AuthenticatedContext) => Promise<void> | void;

/** Handler med autentisering og validert body */
type ValidatedHandler<T> = (ctx: ValidatedContext<T>) => Promise<void> | void;

// ============================================================
// Middleware-wrappers
// ============================================================

/**
 * Wrapper som verifiserer Firebase ID-token.
 * Returnerer 401 hvis tokenet mangler eller er ugyldig.
 *
 * Bruk:
 *   const getMe = withAuth(async ({ user, res }) => {
 *     success(res, { uid: user.uid, email: user.email });
 *   });
 */
export function withAuth(handler: AuthHandler): PublicHandler {
  return async ({ req, res }) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      fail(res, "Ikke autentisert", 401);
      return;
    }

    try {
      const token = header.split("Bearer ")[1];
      if (!token) {
        fail(res, "Ikke autentisert", 401);
        return;
      }
      const user = await admin.auth().verifyIdToken(token);
      await handler({ req, res, user });
    } catch {
      fail(res, "Ugyldig eller utløpt token", 401);
      return;
    }
  };
}

/**
 * Wrapper som verifiserer auth + validerer request body med Zod.
 * Returnerer 400 med valideringsfeil hvis body er ugyldig.
 *
 * Bruk:
 *   const createNote = withValidation(createNoteSchema, async ({ user, data, res }) => {
 *     const note = await db.collection("notes").add({ ...data, userId: user.uid });
 *     success(res, { id: note.id, ...data }, 201);
 *   });
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: ValidatedHandler<T>
): PublicHandler {
  return withAuth(async ({ req, res, user }) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.errors.map((e: z.ZodIssue) => e.message).join(", ");
      fail(res, messages);
      return;
    }
    await handler({ req, res, user, data: parsed.data });
  });
}

// ============================================================
// Admin-middleware
// ============================================================

/** Sjekk om autentisert bruker har admin-rolle */
export function withAdmin(handler: AuthHandler): PublicHandler {
  return withAuth(async (ctx) => {
    if (!ctx.user.admin) {
      fail(ctx.res, "Krever administratortilgang", 403);
      return;
    }
    await handler(ctx);
  });
}

// ============================================================
// API-nøkkel eller Firebase Auth middleware
// ============================================================

/**
 * Godkjenner enten Firebase ID-token (Bearer) eller API-nøkkel (x-api-key).
 * For API-nøkkel: hasher nøkkelen, slår opp i Firestore, setter bruker til eieren.
 */
export function withApiKeyOrAuth(handler: AuthHandler): PublicHandler {
  return async ({ req, res }) => {
    // 1. Prøv Firebase ID-token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1];
        const user = await admin.auth().verifyIdToken(token);
        await handler({ req, res, user });
        return;
      } catch {
        fail(res, "Ugyldig eller utløpt token", 401);
        return;
      }
    }

    // 2. Prøv API-nøkkel
    const apiKey = req.headers["x-api-key"] as string | undefined;
    if (apiKey) {
      try {
        const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");
        const snapshot = await admin.firestore()
          .collection("apiKeys")
          .where("hashedKey", "==", hashedKey)
          .where("revoked", "==", false)
          .limit(1)
          .get();

        if (snapshot.empty) {
          fail(res, "Ugyldig API-nøkkel", 401);
          return;
        }

        const keyDoc = snapshot.docs[0];
        const keyData = keyDoc.data();

        // Oppdater lastUsedAt
        await keyDoc.ref.update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp() });

        // Lag en pseudo-DecodedIdToken med eierens UID
        const user = { uid: keyData.userId } as DecodedIdToken;
        await handler({ req, res, user });
        return;
      } catch {
        fail(res, "Feil ved API-nøkkel-verifisering", 500);
        return;
      }
    }

    fail(res, "Ikke autentisert — send Bearer-token eller x-api-key", 401);
  };
}

// ============================================================
// Tenant-middleware (#36)
// ============================================================

/** Kontekst med tenant-resolving */
export type TenantContext = AuthenticatedContext & {
  tenantId: string | null;
};

/** Handler med autentisering og resolved tenantId */
type TenantHandler = (ctx: TenantContext) => Promise<void> | void;

/**
 * Wrapper som autentiserer og resolver tenantId fra Firebase custom claims.
 * tenantId settes av Feide OIDC-callback ved innlogging (eduPersonOrgDN → tenantId).
 * Superadmin-requests uten tenantId får null — kan se på tvers av tenanter.
 */
export function withTenant(handler: TenantHandler): PublicHandler {
  return withAuth(async (ctx) => {
    const tenantId = (ctx.user.tenantId as string | null) ?? null;
    await handler({ ...ctx, tenantId });
  });
}

/**
 * Som withTenant, men krever at tenantId eksisterer.
 * Returnerer 403 for brukere uten tenant-tilknytning.
 */
export function withRequiredTenant(handler: TenantHandler): PublicHandler {
  return withTenant(async (ctx) => {
    if (!ctx.tenantId && !ctx.user.admin) {
      fail(ctx.res, "Ingen tenant-tilknytning — logg inn med Feide", 403);
      return;
    }
    await handler(ctx);
  });
}

// ============================================================
// Tenant-admin middleware (#134)
// ============================================================

/** Kontekst med garantert tenantId (non-null) */
export type TenantAdminContext = AuthenticatedContext & {
  tenantId: string;
};

type TenantAdminHandler = (ctx: TenantAdminContext) => Promise<void> | void;

/**
 * Wrapper for skole-admin endepunkter (#134).
 * Krever:
 * - Autentisert bruker
 * - Rolle "admin" eller "superadmin"
 * - tenantId custom claim (satt via Feide OIDC)
 *
 * Superadmins med tenantId i query-param kan operere på andres tenanter.
 */
export function withTenantAdmin(handler: TenantAdminHandler): PublicHandler {
  return withAuth(async (ctx) => {
    const role = (ctx.user.role as string) ?? (ctx.user.admin ? "superadmin" : "student");

    if (!["admin", "superadmin"].includes(role)) {
      fail(ctx.res, "Krever skoleadministrator-tilgang", 403);
      return;
    }

    // Superadmin kan operere på en spesifikk tenant via query-param
    const tenantId =
      (role === "superadmin" && ctx.req.query.tenantId as string) ||
      (ctx.user.tenantId as string | null) ||
      null;

    if (!tenantId) {
      fail(ctx.res, "Ingen tenant-tilknytning", 403);
      return;
    }

    await handler({ ...ctx, tenantId });
  });
}

// ============================================================
// CSRF-beskyttelse (#139)
// ============================================================

/** Validerer CSRF-token på muterende forespørsler (POST, PUT, PATCH, DELETE) */
export function validateCsrf({ req, res }: RouteContext): boolean {
  // Bare valider muterende metoder
  if (req.method === "GET" || req.method === "OPTIONS" || req.method === "HEAD") {
    return true;
  }

  const token = req.headers["x-csrf-token"] as string | undefined;

  // Token må eksistere og ha gyldig format (64 hex-tegn)
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    fail(res, "Ugyldig eller manglende CSRF-token", 403);
    return false;
  }

  return true;
}

// ============================================================
// Rate limiting (in-memory IP + Firestore per-bruker/tenant)
// ============================================================

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * In-memory IP-basert rate limiter (første forsvarslinje).
 * Standard: 100 forespørsler per minutt per IP.
 */
export function rateLimit(
  maxRequests = 100,
  windowMs = 60_000
): (ctx: RouteContext) => boolean {
  return ({ req, res }) => {
    const ip = req.ip || req.headers["x-forwarded-for"] as string || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      fail(res, "For mange forespørsler — prøv igjen senere", 429);
      return false;
    }

    return true;
  };
}

// ============================================================
// Per-bruker rate limiting (Firestore-basert) (#145)
// ============================================================

/** Kvoter per Stripe-plan for tenant-nivå */
export const TENANT_QUOTAS: Record<string, { aiCallsPerMonth: number; apiCallsPerMinute: number }> = {
  free:     { aiCallsPerMonth: 100,    apiCallsPerMinute: 30 },
  starter:  { aiCallsPerMonth: 1_000,  apiCallsPerMinute: 60 },
  skole:    { aiCallsPerMonth: 10_000, apiCallsPerMinute: 100 },
  kommune:  { aiCallsPerMonth: -1,     apiCallsPerMinute: 200 }, // -1 = ubegrenset
};

/** Per-bruker grenser */
const USER_LIMITS = {
  /** AI/LLM-kall per time per bruker */
  aiPerHour: 30,
  /** Generelle API-kall per minutt per bruker */
  apiPerMinute: 100,
};

/**
 * Firestore-basert per-bruker rate limiter.
 * Bruker sliding window med atomiske inkrementeringer.
 *
 * Samling: _rateLimits/{userId}_{window}
 */
export async function checkUserRateLimit(
  uid: string,
  type: "ai" | "api",
  res: Response
): Promise<boolean> {
  const db = admin.firestore();
  const now = Date.now();

  const windowMs = type === "ai" ? 60 * 60 * 1000 : 60 * 1000; // 1 time / 1 minutt
  const maxRequests = type === "ai" ? USER_LIMITS.aiPerHour : USER_LIMITS.apiPerMinute;
  const windowKey = Math.floor(now / windowMs);
  const docId = `${uid}_${type}_${windowKey}`;
  const docRef = db.collection("_rateLimits").doc(docId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) {
        tx.set(docRef, {
          count: 1,
          uid,
          type,
          windowStart: now,
          expiresAt: new Date(now + windowMs + 60_000), // TTL med margin
        });
        return { allowed: true, count: 1 };
      }

      const count = (doc.data()?.count ?? 0) + 1;
      if (count > maxRequests) {
        return { allowed: false, count };
      }

      tx.update(docRef, { count });
      return { allowed: true, count };
    });

    if (!result.allowed) {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.set("Retry-After", String(retryAfter));
      res.set("X-RateLimit-Limit", String(maxRequests));
      res.set("X-RateLimit-Remaining", "0");
      fail(
        res,
        type === "ai"
          ? `Du har nådd grensen på ${maxRequests} AI-meldinger per time. Prøv igjen litt senere.`
          : `For mange forespørsler (${maxRequests}/minutt). Prøv igjen om litt.`,
        429
      );
      return false;
    }

    // Sett informative headers
    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(maxRequests - result.count));

    return true;
  } catch (err) {
    // Ved Firestore-feil: tillat forespørselen (fail-open) og logg
    console.error("[rate-limit] Firestore-feil:", err);
    return true;
  }
}

// ============================================================
// Per-tenant kvote-sjekk (#145)
// ============================================================

/**
 * Sjekk om tenant har brukt opp sin månedlige AI-kvote.
 * Bruker Firestore-dokument: _tenantUsage/{tenantId}_{YYYY-MM}
 */
export async function checkTenantQuota(
  tenantId: string,
  plan: string,
  res: Response
): Promise<boolean> {
  const quota = TENANT_QUOTAS[plan] ?? TENANT_QUOTAS.free;

  // Ubegrenset plan
  if (quota.aiCallsPerMonth === -1) return true;

  const db = admin.firestore();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const docId = `${tenantId}_${monthKey}`;
  const docRef = db.collection("_tenantUsage").doc(docId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);

      if (!doc.exists) {
        tx.set(docRef, {
          tenantId,
          month: monthKey,
          aiCalls: 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { allowed: true, used: 1 };
      }

      const data = doc.data()!;
      const used = (data.aiCalls ?? 0) + 1;

      // Varsl ved 80% kvotebruk
      if (used === Math.floor(quota.aiCallsPerMonth * 0.8)) {
        console.warn(
          `[tenant-quota] Tenant ${tenantId} har brukt 80% av AI-kvoten (${used}/${quota.aiCallsPerMonth})`
        );
      }

      if (used > quota.aiCallsPerMonth) {
        return { allowed: false, used };
      }

      tx.update(docRef, {
        aiCalls: used,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { allowed: true, used };
    });

    if (!result.allowed) {
      res.set("X-Quota-Limit", String(quota.aiCallsPerMonth));
      res.set("X-Quota-Used", String(result.used));
      fail(
        res,
        `Skolen har brukt opp sin månedlige AI-kvote (${quota.aiCallsPerMonth} kall). ` +
          "Kontakt administrator for å oppgradere planen.",
        429
      );
      return false;
    }

    res.set("X-Quota-Limit", String(quota.aiCallsPerMonth));
    res.set("X-Quota-Remaining", String(quota.aiCallsPerMonth - result.used));

    return true;
  } catch (err) {
    // Fail-open ved Firestore-feil
    console.error("[tenant-quota] Firestore-feil:", err);
    return true;
  }
}

// ============================================================
// Kombinert rate limit-middleware for autentiserte ruter (#145)
// ============================================================

/**
 * Komplett per-bruker rate limiting for autentiserte handlers.
 * Sjekker bruker-grense og (valgfritt) tenant-kvote.
 *
 * @param type - "ai" for LLM-endepunkter (30/time), "api" for generelle (100/min)
 */
export function withRateLimit(
  type: "ai" | "api",
  handler: AuthHandler
): PublicHandler {
  return withAuth(async (ctx) => {
    // Per-bruker rate limit
    if (!(await checkUserRateLimit(ctx.user.uid, type, ctx.res))) return;

    // Per-tenant kvote (kun for AI-kall)
    if (type === "ai") {
      const tenantId = (ctx.user.tenantId as string) ?? null;
      const plan = (ctx.user.plan as string) ?? "free";
      if (tenantId) {
        if (!(await checkTenantQuota(tenantId, plan, ctx.res))) return;
      }
    }

    await handler(ctx);
  });
}
