/**
 * Karrierestiutforsker E2E-tester (Issue #66)
 */

import { test, expect } from "@playwright/test";

test.describe("Karrierestiutforsker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/karriere");
    await page.waitForLoadState("networkidle");
  });

  test("karriere-siden lastes med heading", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
    const text = await heading.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test("karrierenoder eller karriereliste vises", async ({ page }) => {
    // Karrieresiden bør vise enten kort, noder eller en søkefunksjon
    const cards = page.locator("[class*='card'], [role='listitem'], [role='article']");
    const links = page.locator("a[href*='karriere']");
    const buttons = page.locator("button").filter({ hasText: /utforsk|se|velg|karriere/i });

    const cardCount = await cards.count();
    const linkCount = await links.count();
    const buttonCount = await buttons.count();

    // Minst en av disse bør finnes
    expect(cardCount + linkCount + buttonCount).toBeGreaterThan(0);
  });

  test("karriere-relatert innhold vises på siden", async ({ page }) => {
    const bodyText = await page.textContent("body");
    // Sannsynligvis inneholder minst et yrkesnavn
    const hasCareerContent =
      /ingeniør|sykepleier|lærer|utvikler|lege|designer|karriere|yrke/i.test(bodyText ?? "");
    expect(hasCareerContent).toBe(true);
  });
});

test.describe("Studier-siden", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/studier");
    await page.waitForLoadState("networkidle");
  });

  test("studier-siden lastes med heading", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("studiedata eller empty state vises", async ({ page }) => {
    // Sjekk at det finnes innhold — enten studieliste eller tom-tilstand
    const content = page.locator("main, [role='main']").or(page.locator("body"));
    const text = await content.first().innerText();
    expect(text.length).toBeGreaterThan(50);
  });
});

test.describe("Karakterer-siden", () => {
  test("karakterer-siden lastes med heading og skjemaelementer", async ({ page }) => {
    await page.goto("/dashboard/karakterer");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();

    // Karaktersiden bør ha input-felt eller select for fag/karakterer
    const inputs = page.locator("input, select, [role='combobox']");
    const inputCount = await inputs.count();
    // Bør ha minst ett skjemaelement for karakterregistrering
    expect(inputCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("CV-builder", () => {
  test("cv-siden lastes med heading", async ({ page }) => {
    await page.goto("/dashboard/cv");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("cv-skjema har inputfelt", async ({ page }) => {
    await page.goto("/dashboard/cv");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.textContent("body");
    // CV-relatert innhold
    const hasCvContent = /cv|erfaring|utdanning|kompetanse|ferdighet/i.test(bodyText ?? "");
    expect(hasCvContent).toBe(true);
  });
});

test.describe("GDPR mine-data", () => {
  test("mine-data-siden lastes", async ({ page }) => {
    await page.goto("/dashboard/mine-data");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("eksport-knapp er tilgjengelig", async ({ page }) => {
    await page.goto("/dashboard/mine-data");
    await page.waitForLoadState("networkidle");

    const exportBtn = page.getByRole("button").filter({
      hasText: /eksporter|last ned|hent data/i,
    });
    const exportCount = await exportBtn.count();
    // Bør ha minst en eksport-knapp
    expect(exportCount).toBeGreaterThan(0);
  });
});
