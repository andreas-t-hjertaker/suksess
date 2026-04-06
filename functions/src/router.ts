/**
 * Central route registry for Suksess API.
 * Consolidates all route definitions in one place for easy navigation.
 * Handlers should be imported from their respective module files.
 */

import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

export type RouteHandler = (ctx: { req: Request; res: Response }) => Promise<void> | void;

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: RouteHandler;
  description?: string;
}

/**
 * Route table — will be populated by importing handlers from separate modules.
 * Currently kept here as a central registry for router matching logic.
 *
 * Structure:
 * 1. Exact path matching: fastest, O(1) lookup
 * 2. Prefix matching: handled separately for :param routes
 * 3. Special cases: consent verification, GDPR export, etc.
 */
export const routes: Route[] = [
  // Routes will be populated when handlers are imported
  // This file serves as the central registry and match logic
];

/**
 * Route matching helper — attempts exact match first, then provides
 * interface for prefix-based parameter extraction in main handler.
 */
export function findRoute(method: string, path: string): Route | null {
  return routes.find((r) => r.method === method && r.path === path) || null;
}
