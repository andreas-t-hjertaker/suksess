/**
 * Tester for foresatt-kobling (#106)
 *
 * Verifiserer:
 * - Invitasjonskode-generering (format, unikhet, gyldighet)
 * - Kodeformatering
 * - Utløpssjekk
 * - Kodevalidering
 */

import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  formatInviteCode,
  isInviteExpired,
  isValidInviteCode,
} from "./guardian-link";

// ─── Kodegenerering ─────────────────────────────────────────────────────────

describe("generateInviteCode (#106)", () => {
  it("genererer en 6-tegns kode", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it("bruker kun tillatte tegn (A-Z uten I/O, 2-9)", () => {
    const allowed = /^[A-HJ-NP-Z2-9]{6}$/;
    for (let i = 0; i < 50; i++) {
      expect(generateInviteCode()).toMatch(allowed);
    }
  });

  it("inneholder aldri forvirrende tegn (I, O, 0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).not.toContain("I");
      expect(code).not.toContain("O");
      expect(code).not.toContain("0");
      expect(code).not.toContain("1");
    }
  });

  it("genererer unike koder", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    // Med 30^6 = 729M mulige koder bør 100 stk alltid være unike
    expect(codes.size).toBe(100);
  });
});

// ─── Formatering ────────────────────────────────────────────────────────────

describe("formatInviteCode (#106)", () => {
  it("formaterer 6-tegns kode med mellomrom (ABC 123)", () => {
    expect(formatInviteCode("ABC123")).toBe("ABC 123");
  });

  it("formaterer vilkårlig kode", () => {
    expect(formatInviteCode("XY7K9P")).toBe("XY7 K9P");
  });

  it("returnerer uendret for ugyldig lengde", () => {
    expect(formatInviteCode("AB")).toBe("AB");
    expect(formatInviteCode("ABCDEFG")).toBe("ABCDEFG");
  });
});

// ─── Utløpssjekk ───────────────────────────────────────────────────────────

describe("isInviteExpired (#106)", () => {
  it("returnerer false for fremtidig utløpstid", () => {
    const future = new Date(Date.now() + 10 * 60 * 1000); // 10 min frem
    expect(isInviteExpired(future)).toBe(false);
  });

  it("returnerer true for passert utløpstid", () => {
    const past = new Date(Date.now() - 1000); // 1 sek siden
    expect(isInviteExpired(past)).toBe(true);
  });

  it("returnerer true for nøyaktig nå (edge case)", () => {
    const now = new Date(Date.now() - 1); // 1ms siden
    expect(isInviteExpired(now)).toBe(true);
  });
});

// ─── Kodevalidering ─────────────────────────────────────────────────────────

describe("isValidInviteCode (#106)", () => {
  it("godtar gyldig 6-tegns kode", () => {
    expect(isValidInviteCode("ABC234")).toBe(true);
    expect(isValidInviteCode("XY7K9P")).toBe(true);
  });

  it("avviser for kort kode", () => {
    expect(isValidInviteCode("ABC")).toBe(false);
  });

  it("avviser for lang kode", () => {
    expect(isValidInviteCode("ABCDEFG")).toBe(false);
  });

  it("avviser kode med ugyldige tegn", () => {
    expect(isValidInviteCode("abc234")).toBe(false); // lowercase
    expect(isValidInviteCode("ABC 23")).toBe(false); // mellomrom
    expect(isValidInviteCode("ABC10O")).toBe(false); // inneholder 1, 0, O
  });

  it("avviser tom streng", () => {
    expect(isValidInviteCode("")).toBe(false);
  });

  it("genererte koder er alltid gyldige", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidInviteCode(generateInviteCode())).toBe(true);
    }
  });
});
