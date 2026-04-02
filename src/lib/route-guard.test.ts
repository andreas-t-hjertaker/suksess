/**
 * Tester for ruteautentisering (#139)
 *
 * Verifiserer at:
 * - Beskyttede ruter krever riktig rolle
 * - Offentlige ruter er tilgjengelige for alle
 * - Redirect-logikk fungerer korrekt
 * - CSRF-token format valideres
 */

import { describe, it, expect } from "vitest";
import {
  getRouteConfig,
  isProtectedRoute,
  isGuestOnlyRoute,
  hasRequiredRole,
  buildRedirectUrl,
  getRedirectUrl,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
} from "./route-guard";
import { isValidCsrfFormat } from "./csrf";

// ─── Rutekonfigurasjon ──────────────────────────────────────────────────────

describe("getRouteConfig (#139)", () => {
  it("finner konfig for /dashboard", () => {
    const config = getRouteConfig("/dashboard");
    expect(config).not.toBeNull();
    expect(config!.requiredRole).toBe("authenticated");
  });

  it("finner konfig for /dashboard/profil (prefix-match)", () => {
    const config = getRouteConfig("/dashboard/profil");
    expect(config).not.toBeNull();
    expect(config!.requiredRole).toBe("authenticated");
  });

  it("finner konfig for /admin", () => {
    const config = getRouteConfig("/admin");
    expect(config).not.toBeNull();
    expect(config!.requiredRole).toBe("admin");
  });

  it("finner konfig for /admin/brukere", () => {
    const config = getRouteConfig("/admin/brukere");
    expect(config).not.toBeNull();
    expect(config!.requiredRole).toBe("admin");
  });

  it("finner konfig for /onboarding", () => {
    const config = getRouteConfig("/onboarding");
    expect(config).not.toBeNull();
    expect(config!.requiredRole).toBe("authenticated");
  });

  it("returnerer null for offentlige ruter", () => {
    expect(getRouteConfig("/")).toBeNull();
    expect(getRouteConfig("/login")).toBeNull();
    expect(getRouteConfig("/pricing")).toBeNull();
  });
});

// ─── isProtectedRoute ───────────────────────────────────────────────────────

describe("isProtectedRoute (#139)", () => {
  it("identifiserer beskyttede ruter", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/veileder")).toBe(true);
    expect(isProtectedRoute("/admin")).toBe(true);
    expect(isProtectedRoute("/admin/elever")).toBe(true);
    expect(isProtectedRoute("/onboarding")).toBe(true);
  });

  it("identifiserer offentlige ruter", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/pricing")).toBe(false);
    expect(isProtectedRoute("/legal")).toBe(false);
    expect(isProtectedRoute("/personvern")).toBe(false);
  });
});

// ─── isGuestOnlyRoute ───────────────────────────────────────────────────────

describe("isGuestOnlyRoute (#139)", () => {
  it("/login er kun for gjester", () => {
    expect(isGuestOnlyRoute("/login")).toBe(true);
  });

  it("andre ruter er ikke kun for gjester", () => {
    expect(isGuestOnlyRoute("/dashboard")).toBe(false);
    expect(isGuestOnlyRoute("/")).toBe(false);
    expect(isGuestOnlyRoute("/pricing")).toBe(false);
  });
});

// ─── hasRequiredRole ────────────────────────────────────────────────────────

describe("hasRequiredRole (#139)", () => {
  const adminUser = { authenticated: true, admin: true, counselor: false };
  const normalUser = { authenticated: true, admin: false, counselor: false };
  const counselorUser = { authenticated: true, admin: false, counselor: true };
  const anonymous = { authenticated: false, admin: false, counselor: false };

  it("authenticated-rolle godtar innloggede brukere", () => {
    expect(hasRequiredRole("authenticated", normalUser)).toBe(true);
    expect(hasRequiredRole("authenticated", adminUser)).toBe(true);
  });

  it("authenticated-rolle avviser anonyme", () => {
    expect(hasRequiredRole("authenticated", anonymous)).toBe(false);
  });

  it("admin-rolle godtar admins", () => {
    expect(hasRequiredRole("admin", adminUser)).toBe(true);
  });

  it("admin-rolle avviser vanlige brukere", () => {
    expect(hasRequiredRole("admin", normalUser)).toBe(false);
  });

  it("counselor-rolle godtar rådgivere", () => {
    expect(hasRequiredRole("counselor", counselorUser)).toBe(true);
  });

  it("counselor-rolle avviser vanlige brukere", () => {
    expect(hasRequiredRole("counselor", normalUser)).toBe(false);
  });
});

// ─── buildRedirectUrl ───────────────────────────────────────────────────────

describe("buildRedirectUrl (#139)", () => {
  it("inkluderer callbackUrl for dashboard-ruter", () => {
    const config = getRouteConfig("/dashboard/profil")!;
    const url = buildRedirectUrl(config, "/dashboard/profil");
    expect(url).toBe("/login?callbackUrl=%2Fdashboard%2Fprofil");
  });

  it("inkluderer IKKE callbackUrl for admin-ruter", () => {
    const config = getRouteConfig("/admin")!;
    const url = buildRedirectUrl(config, "/admin");
    expect(url).toBe("/dashboard");
  });
});

// ─── getRedirectUrl ─────────────────────────────────────────────────────────

describe("getRedirectUrl (#139)", () => {
  const normalUser = { authenticated: true, admin: false, counselor: false };
  const adminUser = { authenticated: true, admin: true, counselor: false };
  const anonymous = { authenticated: false, admin: false, counselor: false };

  it("innlogget bruker på /login → redirect til /dashboard", () => {
    expect(getRedirectUrl("/login", normalUser)).toBe("/dashboard");
  });

  it("anonym bruker på /dashboard → redirect til /login med callback", () => {
    const url = getRedirectUrl("/dashboard", anonymous);
    expect(url).toBe("/login?callbackUrl=%2Fdashboard");
  });

  it("anonym bruker på /dashboard/veileder → redirect med callback", () => {
    const url = getRedirectUrl("/dashboard/veileder", anonymous);
    expect(url).toContain("/login?callbackUrl=");
    expect(url).toContain("veileder");
  });

  it("innlogget bruker på /dashboard → ingen redirect", () => {
    expect(getRedirectUrl("/dashboard", normalUser)).toBeNull();
  });

  it("vanlig bruker på /admin → redirect til /dashboard", () => {
    expect(getRedirectUrl("/admin", normalUser)).toBe("/dashboard");
  });

  it("admin-bruker på /admin → ingen redirect", () => {
    expect(getRedirectUrl("/admin", adminUser)).toBeNull();
  });

  it("offentlig rute → ingen redirect for anonym", () => {
    expect(getRedirectUrl("/", anonymous)).toBeNull();
    expect(getRedirectUrl("/pricing", anonymous)).toBeNull();
    expect(getRedirectUrl("/personvern", anonymous)).toBeNull();
  });

  it("offentlig rute → ingen redirect for innlogget", () => {
    expect(getRedirectUrl("/", normalUser)).toBeNull();
    expect(getRedirectUrl("/pricing", normalUser)).toBeNull();
  });
});

// ─── CSRF-token validering ──────────────────────────────────────────────────

describe("CSRF-token validering (#139)", () => {
  it("godtar gyldig 64-tegn hex-token", () => {
    const valid = "a1b2c3d4".repeat(8);
    expect(isValidCsrfFormat(valid)).toBe(true);
  });

  it("avviser for kort token", () => {
    expect(isValidCsrfFormat("abc123")).toBe(false);
  });

  it("avviser for langt token", () => {
    expect(isValidCsrfFormat("a".repeat(65))).toBe(false);
  });

  it("avviser token med ugyldige tegn", () => {
    expect(isValidCsrfFormat("g".repeat(64))).toBe(false);
    expect(isValidCsrfFormat("A".repeat(64))).toBe(false);
  });

  it("avviser tom streng", () => {
    expect(isValidCsrfFormat("")).toBe(false);
  });
});

// ─── Konsistens-sjekker ─────────────────────────────────────────────────────

describe("Rutekonfigurasjon-konsistens (#139)", () => {
  it("alle beskyttede ruter har gyldig redirectTo", () => {
    for (const route of PROTECTED_ROUTES) {
      expect(route.redirectTo).toMatch(/^\//);
    }
  });

  it("ingen overlap mellom beskyttede og offentlige ruter", () => {
    for (const route of PROTECTED_ROUTES) {
      expect(
        PUBLIC_ROUTES.includes(route.pattern),
        `${route.pattern} er både beskyttet og offentlig`
      ).toBe(false);
    }
  });

  it("dashboard redirecter til /login", () => {
    const config = getRouteConfig("/dashboard")!;
    expect(config.redirectTo).toBe("/login");
    expect(config.includeCallback).toBe(true);
  });

  it("admin redirecter til /dashboard (ikke /login)", () => {
    const config = getRouteConfig("/admin")!;
    expect(config.redirectTo).toBe("/dashboard");
    expect(config.includeCallback).toBe(false);
  });
});
