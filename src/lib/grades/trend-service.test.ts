/**
 * Tester for trenddata-tjeneste (#144)
 */

import { describe, it, expect } from "vitest";
import {
  getMockTrend,
  analyzeTrend,
  estimateChance,
  type TrendEntry,
} from "./trend-service";

// ─── getMockTrend ────────────────────────────────────────────────────────────

describe("getMockTrend (#144)", () => {
  it("returnerer mock-data for Medisin|UiO", () => {
    const trend = getMockTrend("Medisin", "UiO");
    expect(trend).toHaveLength(5);
    expect(trend[0].year).toBe(2020);
    expect(trend[4].year).toBe(2024);
  });

  it("returnerer fallback for ukjent program", () => {
    const trend = getMockTrend("Ukjent fag", "Ukjent inst");
    expect(trend).toHaveLength(5);
    expect(trend[0].year).toBe(2020);
  });

  it("har stigende trend for Medisin|UiO", () => {
    const trend = getMockTrend("Medisin", "UiO");
    expect(trend[4].required).toBeGreaterThan(trend[0].required);
  });

  it("top er alltid høyere enn required", () => {
    const trend = getMockTrend("Medisin", "UiO");
    for (const entry of trend) {
      expect(entry.top).toBeGreaterThan(entry.required);
    }
  });
});

// ─── analyzeTrend ────────────────────────────────────────────────────────────

describe("analyzeTrend (#144)", () => {
  it("identifiserer stigende trend", () => {
    const entries: TrendEntry[] = [
      { year: 2020, required: 50, top: 55 },
      { year: 2021, required: 51, top: 56 },
      { year: 2022, required: 52, top: 57 },
    ];
    const result = analyzeTrend(entries);
    expect(result.direction).toBe("rising");
    expect(result.totalChange).toBe(2);
    expect(result.changePerYear).toBe(1);
  });

  it("identifiserer synkende trend", () => {
    const entries: TrendEntry[] = [
      { year: 2020, required: 55, top: 60 },
      { year: 2021, required: 54, top: 59 },
      { year: 2022, required: 53, top: 58 },
    ];
    const result = analyzeTrend(entries);
    expect(result.direction).toBe("falling");
    expect(result.totalChange).toBe(-2);
  });

  it("identifiserer stabil trend", () => {
    const entries: TrendEntry[] = [
      { year: 2020, required: 50.0, top: 55 },
      { year: 2021, required: 50.1, top: 55 },
      { year: 2022, required: 50.2, top: 55 },
    ];
    const result = analyzeTrend(entries);
    expect(result.direction).toBe("stable");
  });

  it("håndterer tom liste", () => {
    const result = analyzeTrend([]);
    expect(result.direction).toBe("stable");
    expect(result.totalChange).toBe(0);
  });

  it("håndterer enkelt punkt", () => {
    const result = analyzeTrend([{ year: 2024, required: 50, top: 55 }]);
    expect(result.direction).toBe("stable");
  });
});

// ─── estimateChance ──────────────────────────────────────────────────────────

describe("estimateChance (#144)", () => {
  const trend: TrendEntry[] = [
    { year: 2023, required: 50, top: 55 },
    { year: 2024, required: 52, top: 57 },
  ];

  it("gir svært gode sjanser med høy margin (poeng >> krav)", () => {
    const result = estimateChance(56, trend);
    expect(result.percentage).toBe(95);
    expect(result.label).toContain("Svært gode");
  });

  it("gir gode sjanser med liten margin over", () => {
    const result = estimateChance(53.5, trend);
    expect(result.percentage).toBe(80);
    expect(result.label).toContain("Gode");
  });

  it("gir usikkert ved grensen", () => {
    const result = estimateChance(52, trend);
    expect(result.percentage).toBe(55);
    expect(result.label).toContain("Usikkert");
  });

  it("gir krevende med lav margin under", () => {
    const result = estimateChance(50, trend);
    expect(result.percentage).toBe(30);
    expect(result.label).toContain("Krevende");
  });

  it("gir svært krevende langt under krav", () => {
    const result = estimateChance(45, trend);
    expect(result.percentage).toBe(10);
    expect(result.label).toContain("Svært krevende");
  });

  it("håndterer tom trend-liste", () => {
    const result = estimateChance(50, []);
    expect(result.percentage).toBe(50);
    expect(result.label).toBe("Ukjent");
  });

  it("inkluderer dark mode-farger", () => {
    const result = estimateChance(56, trend);
    expect(result.color).toContain("dark:");
  });
});
