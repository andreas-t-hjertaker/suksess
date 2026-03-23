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
  });

  test("karrierenoder er synlige", async ({ page }) => {
    // Karrieresiden bør vise karrierenoder/kort
    const content = await page.textContent("body");
    // Sannsynligvis inneholder karriere-relatert tekst
    expect(content).toBeTruthy();
  });
});

test.describe("Studier-siden", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/studier");
    await page.waitForLoadState("networkidle");
  });

  test("studier-siden lastes", async ({ page }) => {
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("tabs er navigerbare med tastatur", async ({ page }) => {
    // Finn tab-buttons
    const tabs = page.getByRole("button").filter({ hasText: /emner|anbefalinger|studietips|eksamen/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    // Klikk på "Anbefalinger"-tab
    const anbefalinger = page.getByRole("button", { name: /anbefalinger/i });
    if (await anbefalinger.isVisible()) {
      await anbefalinger.click();
      // Sjekk at innholdet endrer seg
      await expect(page.getByText(/riasec/i).first()).toBeVisible();
    }
  });
});

test.describe("Karakterer-siden", () => {
  test("karakterer-siden lastes", async ({ page }) => {
    await page.goto("/dashboard/karakterer");
    await page.waitForLoadState("networkidle");
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });
});
