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
import { deleteAccount } from "./handlers/account";
import { awardXp, getXp } from "./handlers/xp";

// ============================================================
// Typer
// ============================================================

export type RouteHandler = (ctx: RouteContext) => Promise<void> | void;

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
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
