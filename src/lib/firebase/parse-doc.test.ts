import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { parseDoc, parseDocs, parseDocsWithId } from "./parse-doc";

/**
 * Tester for Firestore document parser med Zod-validering (#180).
 *
 * Verifiserer at parseDoc/parseDocs/parseDocsWithId korrekt validerer
 * Firestore-dokumenter mot Zod-skjemaer og håndterer ugyldige data.
 */

// Testskjema
const TestSchema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
  active: z.boolean(),
});

// Hjelpefunksjon for å lage mock DocumentSnapshot
function mockSnapshot(data: Record<string, unknown> | null, path = "test/doc1") {
  return {
    exists: () => data !== null,
    data: () => data,
    id: path.split("/").pop() ?? "unknown",
    ref: { path },
  } as unknown as Parameters<typeof parseDoc>[0];
}

// Hjelpefunksjon for å lage mock QueryDocumentSnapshot
function mockQuerySnapshot(data: Record<string, unknown>, id: string, path?: string) {
  return {
    exists: () => true,
    data: () => data,
    id,
    ref: { path: path ?? `test/${id}` },
  } as unknown as Parameters<typeof parseDocs>[0][0];
}

describe("parseDoc", () => {
  it("returnerer validert data for gyldig dokument", () => {
    const snap = mockSnapshot({ name: "Ola", age: 17, active: true });
    const result = parseDoc(snap, TestSchema);

    expect(result).toEqual({ name: "Ola", age: 17, active: true });
  });

  it("returnerer null for ikke-eksisterende dokument", () => {
    const snap = mockSnapshot(null);
    const result = parseDoc(snap, TestSchema);

    expect(result).toBeNull();
  });

  it("returnerer null og logger advarsel for ugyldig data", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const snap = mockSnapshot({ name: 123, age: "ikke-et-tall", active: "ja" });
    const result = parseDoc(snap, TestSchema);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[parseDoc] Valideringsfeil"),
      expect.anything()
    );

    warnSpy.mockRestore();
  });

  it("returnerer null for delvis gyldige data (manglende felt)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const snap = mockSnapshot({ name: "Ola" }); // mangler age og active
    const result = parseDoc(snap, TestSchema);

    expect(result).toBeNull();

    warnSpy.mockRestore();
  });

  it("fungerer med Firestore Timestamp-lignende objekter", () => {
    const TimestampSchema = z.object({
      title: z.string(),
      createdAt: z.object({ toDate: z.function() }).nullable().optional(),
    });

    const snap = mockSnapshot({
      title: "Test",
      createdAt: { toDate: () => new Date() },
    });

    const result = parseDoc(snap, TimestampSchema);
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test");
  });
});

describe("parseDocs", () => {
  it("returnerer alle gyldige dokumenter", () => {
    const docs = [
      mockQuerySnapshot({ name: "Ola", age: 17, active: true }, "1"),
      mockQuerySnapshot({ name: "Kari", age: 18, active: false }, "2"),
    ];

    const result = parseDocs(docs, TestSchema);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Ola", age: 17, active: true });
    expect(result[1]).toEqual({ name: "Kari", age: 18, active: false });
  });

  it("filtrerer bort ugyldige dokumenter med advarsel", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const docs = [
      mockQuerySnapshot({ name: "Ola", age: 17, active: true }, "1"),
      mockQuerySnapshot({ name: 123, age: "feil", active: null }, "2"), // ugyldig
      mockQuerySnapshot({ name: "Kari", age: 16, active: true }, "3"),
    ];

    const result = parseDocs(docs, TestSchema);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Ola");
    expect(result[1].name).toBe("Kari");
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("returnerer tom liste for tom input", () => {
    const result = parseDocs([], TestSchema);
    expect(result).toEqual([]);
  });

  it("returnerer tom liste når alle dokumenter er ugyldige", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const docs = [
      mockQuerySnapshot({ invalid: true }, "1"),
      mockQuerySnapshot({ also: "invalid" }, "2"),
    ];

    const result = parseDocs(docs, TestSchema);

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });
});

describe("parseDocsWithId", () => {
  it("legger til id på hvert gyldig dokument", () => {
    const docs = [
      mockQuerySnapshot({ name: "Ola", age: 17, active: true }, "user-1"),
      mockQuerySnapshot({ name: "Kari", age: 18, active: false }, "user-2"),
    ];

    const result = parseDocsWithId(docs, TestSchema);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "user-1", name: "Ola", age: 17, active: true });
    expect(result[1]).toEqual({ id: "user-2", name: "Kari", age: 18, active: false });
  });

  it("filtrerer ugyldige og beholder id på gyldige", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const docs = [
      mockQuerySnapshot({ name: "Ola", age: 17, active: true }, "ok-1"),
      mockQuerySnapshot({ invalid: true }, "bad-1"),
    ];

    const result = parseDocsWithId(docs, TestSchema);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ok-1");

    warnSpy.mockRestore();
  });

  it("returnerer tom liste for tom input", () => {
    const result = parseDocsWithId([], TestSchema);
    expect(result).toEqual([]);
  });
});
