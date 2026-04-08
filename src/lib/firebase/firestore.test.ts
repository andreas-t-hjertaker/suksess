import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tester for Firestore CRUD-operasjoner (#180).
 *
 * Mocker Firebase SDK for å teste at hjelpefunksjonene korrekt
 * delegerer til Firestore og legger til timestamps.
 */

// Mock Firebase SDK
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn((...args: unknown[]) => ({ path: String(args[1] ?? "") }));
const mockDoc = vi.fn((...args: unknown[]) => ({ path: (args.slice(1) as string[]).join("/") }));
const mockQuery = vi.fn((...args: unknown[]) => args[0]);
const mockServerTimestamp = vi.fn(() => "SERVER_TS");
const mockBatchSet = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn();

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  enableMultiTabIndexedDbPersistence: () => Promise.resolve(),
  collection: (...args: unknown[]) => mockCollection(...args as [unknown, string]),
  doc: (...args: unknown[]) => mockDoc(...args as [unknown, ...string[]]),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn((n: number) => ({ type: "limit", value: n })),
  startAfter: vi.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: () => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  }),
}));

vi.mock("./config", () => ({
  app: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
});

describe("getCollection", () => {
  it("returnerer dokumenter med id fra samling", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "doc1", data: () => ({ name: "Test 1" }) },
        { id: "doc2", data: () => ({ name: "Test 2" }) },
      ],
    });

    const { getCollection } = await import("./firestore");
    const result = await getCollection("users");

    expect(result).toEqual([
      { id: "doc1", name: "Test 1" },
      { id: "doc2", name: "Test 2" },
    ]);
  });

  it("returnerer tom liste for tom samling", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const { getCollection } = await import("./firestore");
    const result = await getCollection("users");

    expect(result).toEqual([]);
  });
});

describe("getDocument", () => {
  it("returnerer dokument med id", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: "user1",
      data: () => ({ name: "Ola" }),
    });

    const { getDocument } = await import("./firestore");
    const result = await getDocument("users", "user1");

    expect(result).toEqual({ id: "user1", name: "Ola" });
  });

  it("returnerer null for ikke-eksisterende dokument", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      id: "missing",
    });

    const { getDocument } = await import("./firestore");
    const result = await getDocument("users", "missing");

    expect(result).toBeNull();
  });
});

describe("addDocument", () => {
  it("legger til dokument med timestamps", async () => {
    const mockRef = { id: "new-doc" };
    mockAddDoc.mockResolvedValue(mockRef);

    const { addDocument } = await import("./firestore");
    const result = await addDocument("users", { name: "Ny Bruker" });

    expect(result).toEqual(mockRef);
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Ny Bruker",
        createdAt: "SERVER_TS",
        updatedAt: "SERVER_TS",
      })
    );
  });
});

describe("updateDocument", () => {
  it("oppdaterer dokument med updatedAt", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    const { updateDocument } = await import("./firestore");
    await updateDocument("users", "user1", { name: "Oppdatert" });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Oppdatert",
        updatedAt: "SERVER_TS",
      })
    );
  });
});

describe("deleteDocument", () => {
  it("sletter dokument", async () => {
    mockDeleteDoc.mockResolvedValue(undefined);

    const { deleteDocument } = await import("./firestore");
    await deleteDocument("users", "user1");

    expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything());
  });
});

describe("subscribeToCollection", () => {
  it("registrerer onSnapshot-lytter og sender data", async () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void) => {
      cb({
        docs: [
          { id: "d1", data: () => ({ value: 1 }) },
          { id: "d2", data: () => ({ value: 2 }) },
        ],
      });
      return unsubscribe;
    });

    const { subscribeToCollection } = await import("./firestore");
    const callback = vi.fn();
    const unsub = subscribeToCollection("items", callback);

    expect(callback).toHaveBeenCalledWith([
      { id: "d1", value: 1 },
      { id: "d2", value: 2 },
    ]);
    expect(unsub).toBe(unsubscribe);
  });
});

describe("subscribeToDocument", () => {
  it("registrerer lytter og sender data for eksisterende dokument", async () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: { exists: () => boolean; id: string; data: () => Record<string, unknown> }) => void) => {
      cb({
        exists: () => true,
        id: "doc1",
        data: () => ({ name: "Test" }),
      });
      return unsubscribe;
    });

    const { subscribeToDocument } = await import("./firestore");
    const callback = vi.fn();
    subscribeToDocument("items", "doc1", callback);

    expect(callback).toHaveBeenCalledWith({ id: "doc1", name: "Test" });
  });

  it("sender null for ikke-eksisterende dokument", async () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: { exists: () => boolean }) => void) => {
      cb({ exists: () => false });
      return vi.fn();
    });

    const { subscribeToDocument } = await import("./firestore");
    const callback = vi.fn();
    subscribeToDocument("items", "missing", callback);

    expect(callback).toHaveBeenCalledWith(null);
  });
});

describe("getCollectionPaginated", () => {
  it("returnerer side med hasMore=true når det er flere", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "d1", data: () => ({ v: 1 }) },
        { id: "d2", data: () => ({ v: 2 }) },
        { id: "d3", data: () => ({ v: 3 }) }, // ekstra = hasMore
      ],
    });

    const { getCollectionPaginated } = await import("./firestore");
    const result = await getCollectionPaginated("items", 2);

    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.lastDoc).toBeTruthy();
  });

  it("returnerer hasMore=false når det ikke er flere", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "d1", data: () => ({ v: 1 }) },
      ],
    });

    const { getCollectionPaginated } = await import("./firestore");
    const result = await getCollectionPaginated("items", 5);

    expect(result.data).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });

  it("returnerer tom side for tom samling", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const { getCollectionPaginated } = await import("./firestore");
    const result = await getCollectionPaginated("items", 10);

    expect(result.data).toEqual([]);
    expect(result.lastDoc).toBeNull();
    expect(result.hasMore).toBe(false);
  });
});

describe("batchWrite", () => {
  it("utfører set-operasjoner med timestamps", async () => {
    const { batchWrite } = await import("./firestore");

    await batchWrite([
      { type: "set", path: "users", id: "u1", data: { name: "Ola" } },
    ]);

    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Ola",
        createdAt: "SERVER_TS",
        updatedAt: "SERVER_TS",
      })
    );
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("utfører update-operasjoner med updatedAt", async () => {
    const { batchWrite } = await import("./firestore");

    await batchWrite([
      { type: "update", path: "users", id: "u1", data: { name: "Kari" } },
    ]);

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Kari",
        updatedAt: "SERVER_TS",
      })
    );
  });

  it("utfører delete-operasjoner", async () => {
    const { batchWrite } = await import("./firestore");

    await batchWrite([
      { type: "delete", path: "users", id: "u1" },
    ]);

    expect(mockBatchDelete).toHaveBeenCalledWith(expect.anything());
  });

  it("håndterer blandede operasjoner", async () => {
    const { batchWrite } = await import("./firestore");

    await batchWrite([
      { type: "set", path: "users", id: "u1", data: { name: "Ny" } },
      { type: "update", path: "users", id: "u2", data: { name: "Oppdatert" } },
      { type: "delete", path: "users", id: "u3" },
    ]);

    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
