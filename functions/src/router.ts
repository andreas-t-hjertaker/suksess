/**
 * Central route registry for Suksess API.
 * All route definitions in one place — handlers imported from domain modules.
 */

import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

// Handler imports
import { createCheckout, createPortal, handleWebhook, createB2BCustomer, createB2BSubscription, getB2BInvoices, getEhfStatusHandler, retryEhfHandler } from "./handlers/stripe";
import { setAdminRole, listAdminUsers, getAdminUser, disableAdminUser, deleteAdminUser, getAdminStats, listFeatureFlags, createFeatureFlag, updateFeatureFlag } from "./handlers/admin";
import { listSchoolUsers, setSchoolUserRole, disableSchoolUser, deleteSchoolUser, bulkImportSchoolUsers, getSchoolStats, getSchoolGdprConsents, exportSchoolGdprConsents, getSchoolInvoices } from "./handlers/school-admin";
import { listApiKeys, createApiKey, revokeApiKey } from "./handlers/api-keys";
import { sendEmailHandler, sendInviteEmail, sendParentConsentEmail, unlinkParent } from "./handlers/email-handlers";
import { awardXp, getXp } from "./handlers/xp";
import { verifyConsentToken } from "./handlers/consent";
import { createNote, getNotes } from "./handlers/notes";
import { deleteAccount } from "./handlers/account";
import * as admin from "firebase-admin";
import { success, withAuth, withAdmin, type RouteContext } from "./middleware";

// ============================================================
// Inline handlers (too small for their own file)
// ============================================================

/** GET / — API-info (offentlig) */
const getRoot = ({ res }: RouteContext) => {
  success(res, { message: "Suksess API", version: "1.0.0" });
};

/** GET /collections — List Firestore-samlinger (kun admin) */
const getCollections = withAdmin(async ({ res }) => {
  const db = admin.firestore();
  const collections = await db.listCollections();
  success(res, { collections: collections.map((c) => c.id) });
});

/** GET /me — Brukerinfo (krever auth) */
const getMe = withAuth(async ({ user, res }) => {
  success(res, {
    uid: user.uid,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
});

// ============================================================
// Types
// ============================================================

export type RouteHandler = (ctx: { req: Request; res: Response }) => Promise<void> | void;

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: RouteHandler;
}

// ============================================================
// Exact-match route table
// ============================================================

export const routes: Route[] = [
  // Core
  { method: "GET", path: "/", handler: getRoot },
  { method: "GET", path: "/collections", handler: getCollections },
  { method: "GET", path: "/me", handler: getMe },

  // Notes
  { method: "POST", path: "/notes", handler: createNote },
  { method: "GET", path: "/notes", handler: getNotes },

  // Stripe
  { method: "POST", path: "/stripe/checkout", handler: createCheckout },
  { method: "POST", path: "/stripe/portal", handler: createPortal },
  { method: "POST", path: "/stripe/webhook", handler: handleWebhook },

  // Stripe B2B
  { method: "POST", path: "/stripe/b2b/customer", handler: createB2BCustomer },
  { method: "POST", path: "/stripe/b2b/subscription", handler: createB2BSubscription },
  { method: "GET", path: "/stripe/b2b/invoices", handler: getB2BInvoices },
  { method: "GET", path: "/stripe/b2b/ehf-status", handler: getEhfStatusHandler },
  { method: "POST", path: "/stripe/b2b/ehf-retry", handler: retryEhfHandler },

  // API-nøkler (exact matches)
  { method: "GET", path: "/api-keys", handler: listApiKeys },
  { method: "POST", path: "/api-keys", handler: createApiKey },

  // Admin
  { method: "POST", path: "/admin/set-role", handler: setAdminRole },
  { method: "GET", path: "/admin/users", handler: listAdminUsers },
  { method: "GET", path: "/admin/stats", handler: getAdminStats },
  { method: "GET", path: "/admin/feature-flags", handler: listFeatureFlags },
  { method: "POST", path: "/admin/feature-flags", handler: createFeatureFlag },

  // E-post
  { method: "POST", path: "/email/send", handler: sendEmailHandler },
  { method: "POST", path: "/email/invite", handler: sendInviteEmail },
  { method: "POST", path: "/email/parent-consent", handler: sendParentConsentEmail },
  { method: "POST", path: "/parent/unlink", handler: unlinkParent },

  // School-admin (#134)
  { method: "GET", path: "/school-admin/users", handler: listSchoolUsers },
  { method: "GET", path: "/school-admin/stats", handler: getSchoolStats },
  { method: "GET", path: "/school-admin/gdpr/consents", handler: getSchoolGdprConsents },
  { method: "POST", path: "/school-admin/gdpr/export", handler: exportSchoolGdprConsents },
  { method: "POST", path: "/school-admin/users/bulk-import", handler: bulkImportSchoolUsers },
  { method: "GET", path: "/school-admin/invoices", handler: getSchoolInvoices },

  // Konto
  { method: "DELETE", path: "/account", handler: deleteAccount },

  // XP
  { method: "POST", path: "/xp/award", handler: awardXp },
  { method: "GET", path: "/xp", handler: getXp },
];

// ============================================================
// Parameterized route matching
// ============================================================

/**
 * Match a request to a route handler.
 * First tries exact match, then parameterized prefix matching.
 */
export function matchRoute(method: string, path: string): RouteHandler | null {
  // 1. Exact match (O(n) scan, but n is small)
  const exact = routes.find((r) => r.method === method && r.path === path);
  if (exact) return exact.handler;

  // 2. Parameterized routes

  // DELETE /api-keys/:id
  if (method === "DELETE" && path.startsWith("/api-keys/")) {
    return revokeApiKey;
  }

  // Admin user routes: GET/DELETE /admin/users/:uid, POST /admin/users/:uid/disable
  if (path.startsWith("/admin/users/")) {
    if (method === "GET" && !path.endsWith("/disable")) {
      return getAdminUser;
    }
    if (method === "POST" && path.endsWith("/disable")) {
      return disableAdminUser;
    }
    if (method === "DELETE") {
      return deleteAdminUser;
    }
  }

  // GET /consent/verify/:token
  if (method === "GET" && path.startsWith("/consent/verify/")) {
    return verifyConsentToken;
  }

  // PUT /admin/feature-flags/:id
  if (method === "PUT" && path.startsWith("/admin/feature-flags/")) {
    return updateFeatureFlag;
  }

  // School-admin user routes (exclude bulk-import which is exact-matched above)
  if (path.startsWith("/school-admin/users/") && path !== "/school-admin/users/bulk-import") {
    if (method === "POST" && path.endsWith("/role")) {
      return setSchoolUserRole;
    }
    if (method === "POST" && path.endsWith("/disable")) {
      return disableSchoolUser;
    }
    if (method === "DELETE") {
      return deleteSchoolUser;
    }
  }

  return null;
}
