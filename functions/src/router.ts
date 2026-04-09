/**
 * Central route registry for Suksess API.
 * Consolidates all route definitions in one place for easy navigation.
 * Handlers are imported from their respective module files in ./handlers/.
 */

import type { RouteContext } from "./middleware";

// Handler-imports
import { getRoot, getCollections, getMe, createNote, getNotes } from "./handlers/notes";
import {
  createCheckout, createPortal, handleWebhook,
  createB2BCustomer, createB2BSubscription, getB2BInvoices,
  getEhfStatusHandler, retryEhfHandler,
} from "./handlers/stripe";
import { listApiKeys, createApiKey } from "./handlers/api-keys";
import {
  setAdminRole, listAdminUsers, getAdminStats,
  listFeatureFlags, createFeatureFlag,
} from "./handlers/admin";
import { sendEmailHandler, sendInviteEmail, sendParentConsentEmail, unlinkParent } from "./handlers/email-handlers";
import {
  listSchoolUsers, getSchoolStats,
  getSchoolGdprConsents, exportSchoolGdprConsents,
  bulkImportSchoolUsers, getSchoolInvoices,
} from "./handlers/school-admin";
import { importNvbGradesHandler, getNvbStatusHandler } from "./handlers/nvb-import";
import { deleteAccount } from "./handlers/account";
import { awardXp, getXp } from "./handlers/xp";
import { verifyConsent } from "./handlers/consent";
import { revokeApiKey } from "./handlers/api-keys";
import { getAdminUser, disableAdminUser, deleteAdminUser, updateFeatureFlag } from "./handlers/admin";
import { setSchoolUserRole, disableSchoolUser, deleteSchoolUser } from "./handlers/school-admin";

// ============================================================
// Typer
// ============================================================

export type RouteHandler = (ctx: RouteContext) => Promise<void> | void;

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: RouteHandler;
}

/** Parametrisk rute — matcher med startsWith i stedet for eksakt match */
export interface ParamRoute {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  prefix: string;
  /** Ekstra betingelse for sti-matching (f.eks. endsWith) */
  match?: (path: string) => boolean;
  handler: RouteHandler;
}

// ============================================================
// Rutetabell — eksakt sti-matching
// ============================================================

export const routes: Route[] = [
  // Generelt
  { method: "GET", path: "/", handler: getRoot },
  { method: "GET", path: "/collections", handler: getCollections },
  { method: "GET", path: "/me", handler: getMe },
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
  // API-nøkler
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
  // Foresatt (#106)
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
  // NVB karakterimport (#147)
  { method: "POST", path: "/nvb/import", handler: importNvbGradesHandler },
  { method: "GET", path: "/nvb/status", handler: getNvbStatusHandler },
];

// ============================================================
// Parametriske ruter — matcher prefix + valgfri betingelse
// ============================================================

export const paramRoutes: ParamRoute[] = [
  // API-nøkler: DELETE /api-keys/:id
  { method: "DELETE", prefix: "/api-keys/", handler: revokeApiKey },
  // Admin bruker-ruter: GET /admin/users/:uid
  { method: "GET", prefix: "/admin/users/", handler: getAdminUser },
  // Admin bruker-ruter: POST /admin/users/:uid/disable
  { method: "POST", prefix: "/admin/users/", match: (p) => p.endsWith("/disable"), handler: disableAdminUser },
  // Admin bruker-ruter: DELETE /admin/users/:uid
  { method: "DELETE", prefix: "/admin/users/", handler: deleteAdminUser },
  // Admin feature-flags: PUT /admin/feature-flags/:id
  { method: "PUT", prefix: "/admin/feature-flags/", handler: updateFeatureFlag },
  // Samtykke: GET /consent/verify/:token (#106)
  { method: "GET", prefix: "/consent/verify/", handler: verifyConsent },
  // School-admin: POST /school-admin/users/:uid/role
  { method: "POST", prefix: "/school-admin/users/", match: (p) => p.endsWith("/role") && p !== "/school-admin/users/bulk-import", handler: setSchoolUserRole },
  // School-admin: POST /school-admin/users/:uid/disable
  { method: "POST", prefix: "/school-admin/users/", match: (p) => p.endsWith("/disable"), handler: disableSchoolUser },
  // School-admin: DELETE /school-admin/users/:uid
  { method: "DELETE", prefix: "/school-admin/users/", handler: deleteSchoolUser },
];

// ============================================================
// Rute-matching
// ============================================================

/**
 * Finn en eksakt rute-match.
 */
export function findRoute(method: string, path: string): Route | null {
  return routes.find((r) => r.method === method && r.path === path) || null;
}

/**
 * Finn en parametrisk rute-match (prefix + valgfri betingelse).
 */
export function findParamRoute(method: string, path: string): ParamRoute | null {
  return paramRoutes.find((r) =>
    r.method === method &&
    path.startsWith(r.prefix) &&
    (!r.match || r.match(path))
  ) || null;
}
