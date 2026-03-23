/**
 * Unit tests for Cloud Functions middleware (Issue #43)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock firebase-admin ──────────────────────────────────────────────────────
vi.mock("firebase-admin", () => ({
  default: {
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn(),
    })),
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      })),
      FieldValue: { serverTimestamp: vi.fn() },
    })),
  },
  auth: vi.fn(() => ({ verifyIdToken: vi.fn() })),
  firestore: vi.fn(),
}));

import * as adminModule from "firebase-admin";
import { withAuth, withAdmin, withTenant, fail, success } from "./middleware";

// ─── Hjelpere ─────────────────────────────────────────────────────────────────

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status: vi.fn(function (this: typeof res, code: number) { this.statusCode = code; return this; }),
    json: vi.fn(function (this: typeof res, data: unknown) { this.body = data; return this; }),
  };
  return res;
}

function mockReq(opts: { headers?: Record<string, string>; body?: unknown; path?: string; method?: string } = {}) {
  return {
    headers: opts.headers ?? {},
    body: opts.body ?? {},
    path: opts.path ?? "/",
    method: opts.method ?? "GET",
    query: {},
    ip: "127.0.0.1",
  } as unknown as import("firebase-functions/v2/https").Request;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fail()", () => {
  it("setter status 400 og error-body som standard", () => {
    const res = mockRes();
    fail(res as unknown as import("express").Response, "Noe gikk galt");
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, error: "Noe gikk galt" });
  });

  it("setter egendefinert status", () => {
    const res = mockRes();
    fail(res as unknown as import("express").Response, "Ikke funnet", 404);
    expect(res.statusCode).toBe(404);
  });
});

describe("success()", () => {
  it("setter status 200 og data-body", () => {
    const res = mockRes();
    success(res as unknown as import("express").Response, { id: "123" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: "123" } });
  });

  it("setter egendefinert status", () => {
    const res = mockRes();
    success(res as unknown as import("express").Response, {}, 201);
    expect(res.statusCode).toBe(201);
  });
});

describe("withAuth()", () => {
  let mockAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAuth = vi.fn();
    vi.mocked(adminModule.default.auth).mockReturnValue({ verifyIdToken: mockAuth } as never);
  });

  it("returnerer 401 uten Authorization-header", async () => {
    const handler = withAuth(vi.fn());
    const req = mockReq();
    const res = mockRes();
    await handler({ req, res: res as unknown as import("express").Response });
    expect(res.statusCode).toBe(401);
  });

  it("returnerer 401 med ugyldig token", async () => {
    mockAuth.mockRejectedValue(new Error("Invalid token"));
    const handler = withAuth(vi.fn());
    const req = mockReq({ headers: { authorization: "Bearer bad-token" } });
    const res = mockRes();
    await handler({ req, res: res as unknown as import("express").Response });
    expect(res.statusCode).toBe(401);
  });

  it("kaller handler med decoded user ved gyldig token", async () => {
    const fakeUser = { uid: "user123", email: "test@test.no" };
    mockAuth.mockResolvedValue(fakeUser);
    const innerHandler = vi.fn();
    const handler = withAuth(innerHandler);
    const req = mockReq({ headers: { authorization: "Bearer valid-token" } });
    const res = mockRes();
    await handler({ req, res: res as unknown as import("express").Response });
    expect(innerHandler).toHaveBeenCalledWith(
      expect.objectContaining({ user: fakeUser })
    );
  });
});

describe("withAdmin()", () => {
  let mockAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAuth = vi.fn();
    vi.mocked(adminModule.default.auth).mockReturnValue({ verifyIdToken: mockAuth } as never);
  });

  it("returnerer 403 for bruker uten admin-claim", async () => {
    mockAuth.mockResolvedValue({ uid: "user1", admin: false });
    const innerHandler = vi.fn();
    const handler = withAdmin(innerHandler);
    const req = mockReq({ headers: { authorization: "Bearer token" } });
    const res = mockRes();
    await handler({ req, res: res as unknown as import("express").Response });
    expect(res.statusCode).toBe(403);
    expect(innerHandler).not.toHaveBeenCalled();
  });

  it("kaller handler for admin-bruker", async () => {
    mockAuth.mockResolvedValue({ uid: "admin1", admin: true });
    const innerHandler = vi.fn();
    const handler = withAdmin(innerHandler);
    const req = mockReq({ headers: { authorization: "Bearer token" } });
    const res = mockRes();
    await handler({ req, res: res as unknown as import("express").Response });
    expect(innerHandler).toHaveBeenCalled();
  });
});

describe("withTenant()", () => {
  let mockAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAuth = vi.fn();
    vi.mocked(adminModule.default.auth).mockReturnValue({ verifyIdToken: mockAuth } as never);
  });

  it("passer tenantId fra custom claims til handler", async () => {
    mockAuth.mockResolvedValue({ uid: "u1", tenantId: "skole-123" });
    const innerHandler = vi.fn();
    const handler = withTenant(innerHandler);
    const req = mockReq({ headers: { authorization: "Bearer token" } });
    const res = mockRes();
    await handler({ req, res: res as unknown as import("express").Response });
    expect(innerHandler).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "skole-123" })
    );
  });

  it("passer null tenantId for bruker uten tenant", async () => {
    mockAuth.mockResolvedValue({ uid: "u2" });
    const innerHandler = vi.fn();
    const handler = withTenant(innerHandler);
    const req = mockReq({ headers: { authorization: "Bearer token" } });
    const res = mockRes();
    await handler({ req, res: res as unknown as import("express").Response });
    expect(innerHandler).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: null })
    );
  });
});
