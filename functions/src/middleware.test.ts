/**
 * Unit tests for Cloud Functions middleware (Issue #43)
 *
 * NB: Disse testene krever oppdatering — firebase-admin mock er forenklet.
 * Markert som skip inntil middleware-refaktor (se #66).
 */

import { describe, it, expect, vi } from "vitest";
import { fail, success } from "./middleware";

// ─── Hjelpere ─────────────────────────────────────────────────────────────────

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return res;
}

// ─── fail / success hjelpefunksjoner ──────────────────────────────────────────

describe("fail", () => {
  it("returnerer feilmelding med riktig statuskode", () => {
    const res = mockRes();
    fail(res as never, "Ikke autentisert", 401);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Ikke autentisert" })
    );
  });

  it("bruker 400 som standard statuskode", () => {
    const res = mockRes();
    fail(res as never, "Ugyldig forespørsel");
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("success", () => {
  it("returnerer data med 200 statuskode", () => {
    const res = mockRes();
    success(res as never, { message: "ok" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { message: "ok" } })
    );
  });
});

// ─── withAuth / withAdmin / withTenant ────────────────────────────────────────
// Disse testene krever korrekt firebase-admin mock med verifyIdToken.
// Skippet inntil mock-infrastruktur er oppdatert for firebase-admin v13+.

describe.skip("withAuth", () => {
  it("returnerer 401 uten Authorization-header", () => {
    // TODO: Implementer med oppdatert mock
  });
});

describe.skip("withAdmin", () => {
  it("returnerer 403 for ikke-admin-bruker", () => {
    // TODO: Implementer med oppdatert mock
  });
});

describe.skip("withTenant", () => {
  it("passer tenantId fra custom claims til handler", () => {
    // TODO: Implementer med oppdatert mock
  });
});
