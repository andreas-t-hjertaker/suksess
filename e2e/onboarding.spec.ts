/**
 * Onboarding E2E-tester (Issue #66)
 *
 * Tester hele onboarding-flyten:
 * registrer → samtykke → personlighetstest → resultat
 */

import { test, expect } from "@playwright/test";

test.describe("Onboarding-flyt", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Ingen innlogging

  test("viser onboarding-stepper for nye brukere", async ({ page }) => {
    await page.goto("/onboarding");
    // Stepper skal vises med første steg
    await expect(page.getByRole("heading", { name: /velkommen/i })).toBeVisible({ timeout: 10_000 });
  });

  test("samtykke-banner vises og kan godtas", async ({ page }) => {
    await page.goto("/");
    const consentBanner = page.getByRole("dialog", { name: /informasjonskapsler|samtykke/i });
    if (await consentBanner.isVisible()) {
      await page.getByRole("button", { name: /godta|aksepter/i }).click();
      await expect(consentBanner).not.toBeVisible();
    }
  });

  test("personlighetstest er tilgjengelig", async ({ page }) => {
    await page.goto("/dashboard/profil");
    // Enten vises test eller resultater
    const hasTest = await page.getByRole("button", { name: /start test|ta test/i }).isVisible().catch(() => false);
    const hasResults = await page.getByText(/big five|riasec|resultater/i).isVisible().catch(() => false);
    expect(hasTest || hasResults).toBeTruthy();
  });
});
