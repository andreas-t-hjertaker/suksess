/**
 * Tester for i18n-støtte og nynorsk (#131)
 *
 * Verifiserer at:
 * - Alle språk har komplette oversettelser
 * - Nynorsk (nn) er distinkt fra bokmål (nb)
 * - Ingen tomme strenger
 * - Konsistente nøkler på tvers av språk
 */

import { describe, it, expect } from "vitest";
import { MESSAGES, SUPPORTED_LOCALES, type Locale, type Messages } from "./locales";

// ─── Grunnleggende struktur ─────────────────────────────────────────────────

describe("i18n — grunnleggende (#131)", () => {
  it("støtter nb, nn og se", () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(codes).toContain("nb");
    expect(codes).toContain("nn");
    expect(codes).toContain("se");
  });

  it("MESSAGES har alle støttede språk", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(MESSAGES[locale.code], `Mangler meldinger for ${locale.code}`).toBeDefined();
    }
  });
});

// ─── Nøkkelkonsistens ───────────────────────────────────────────────────────

function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe("i18n — nøkkelkonsistens (#131)", () => {
  const nbKeys = getAllKeys(MESSAGES.nb as unknown as Record<string, unknown>);

  it("bokmål har mer enn 50 strenger", () => {
    expect(nbKeys.length).toBeGreaterThan(50);
  });

  it("nynorsk har samme nøkler som bokmål", () => {
    const nnKeys = getAllKeys(MESSAGES.nn as unknown as Record<string, unknown>);
    expect(nnKeys).toEqual(nbKeys);
  });

  it("nordsamisk har samme nøkler som bokmål", () => {
    const seKeys = getAllKeys(MESSAGES.se as unknown as Record<string, unknown>);
    expect(seKeys).toEqual(nbKeys);
  });
});

// ─── Ingen tomme strenger ───────────────────────────────────────────────────

function getAllValues(obj: Record<string, unknown>, prefix = ""): { key: string; value: string }[] {
  const entries: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      entries.push(...getAllValues(value as Record<string, unknown>, fullKey));
    } else if (typeof value === "string") {
      entries.push({ key: fullKey, value });
    }
  }
  return entries;
}

describe("i18n — ingen tomme strenger (#131)", () => {
  for (const locale of ["nb", "nn", "se"] as Locale[]) {
    it(`${locale} har ingen tomme strenger`, () => {
      const entries = getAllValues(MESSAGES[locale] as unknown as Record<string, unknown>);
      for (const { key, value } of entries) {
        expect(value.trim().length, `${locale}.${key} er tom`).toBeGreaterThan(0);
      }
    });
  }
});

// ─── Nynorsk er distinkt fra bokmål ─────────────────────────────────────────

describe("i18n — nynorsk er distinkt (#131)", () => {
  it("nynorsk har andre verdier enn bokmål (minst 20 forskjeller)", () => {
    const nbValues = getAllValues(MESSAGES.nb as unknown as Record<string, unknown>);
    const nnValues = getAllValues(MESSAGES.nn as unknown as Record<string, unknown>);

    let differences = 0;
    for (let i = 0; i < nbValues.length; i++) {
      if (nbValues[i].value !== nnValues[i].value) {
        differences++;
      }
    }
    expect(differences).toBeGreaterThanOrEqual(20);
  });

  it("nynorsk bruker typiske nynorskformer", () => {
    const nn = MESSAGES.nn;
    // Typiske nynorske ord
    expect(nn.common.loading).toContain("Lastar");
    expect(nn.common.error).toContain("Ein feil");
    expect(nn.auth.forgotPassword).toContain("Gløymt");
    expect(nn.dashboard.overview).toContain("ei oversikt");
  });

  it("bokmål bruker typiske bokmålsformer", () => {
    const nb = MESSAGES.nb;
    expect(nb.common.loading).toContain("Laster");
    expect(nb.common.error).toContain("En feil");
    expect(nb.auth.forgotPassword).toContain("Glemt");
  });
});

// ─── Navigasjonsstrenger ────────────────────────────────────────────────────

describe("i18n — navigasjon (#131)", () => {
  it("alle navigasjonsstrenger finnes på nynorsk", () => {
    const nn = MESSAGES.nn;
    expect(nn.nav.advisor).toBe("AI-rettleiar");
    expect(nn.nav.cv).toBe("CV-byggjar");
    expect(nn.nav.grades).toBe("Karakterar");
    expect(nn.nav.progress).toBe("Framgang & XP");
    expect(nn.nav.settings).toBe("Innstillingar");
  });
});
