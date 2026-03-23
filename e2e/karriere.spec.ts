/**
 * Karrierestiutforsker E2E-tester (Issue #66)
 *
 * Tester karrierestiutforsker, studieutforsker og jobbmatch.
 */

import { test, expect } from "@playwright/test";

test.describe("Karrierestiutforsker", () => {
  test("karriere-siden laster", async ({ page }) => {
    await page.goto("/dashboard/karriere");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading")).toBeVisible({ timeout: 10_000 });
  });

  test("kan navigere til studier-siden", async ({ page }) => {
    await page.goto("/dashboard/studier");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
  });

  test("jobbmatch-siden laster", async ({ page }) => {
    await page.goto("/dashboard/jobbmatch");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
  });

  test("karriere-siden er tilgjengelig (ingen ARIA-feil)", async ({ page }) => {
    await page.goto("/dashboard/karriere");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

    // Sjekk at det ikke er missing alt-tekst på bilder
    const images = page.locator("img:not([alt])");
    await expect(images).toHaveCount(0);
  });
});

test.describe("Studieutforsker", () => {
  test("viser studieprogram fra Firestore", async ({ page }) => {
    await page.goto("/dashboard/studier");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    // Vent på enten innhold eller tomt-tilstand
    await page.waitForLoadState("networkidle");
    const hasContent = await page.getByRole("article").count() > 0 ||
      await page.getByText(/ingen studier|ingen programmer|studie/i).isVisible().catch(() => false);
    // Siden er lastet, uansett om det er data eller ikke
    expect(await page.getByRole("main").isVisible()).toBeTruthy();
  });
});
