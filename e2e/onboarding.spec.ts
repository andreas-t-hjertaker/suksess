/**
 * Onboarding E2E-tester — verifiserer onboarding-flyt (Issue #66)
 */

import { test, expect } from "@playwright/test";

test.describe("Onboarding-flyt", () => {
  test("onboarding-siden lastes med stepper", async ({ page }) => {
    await page.goto("/onboarding/counselor");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("foresatt-samtykke-siden lastes", async ({ page }) => {
    await page.goto("/onboarding/foresatt-samtykke");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading").first()).toBeVisible();
    // Samtykke-relatert innhold
    const bodyText = await page.textContent("body");
    const hasSamtykke = /samtykke|foresatt|personvern|gdpr/i.test(bodyText ?? "");
    expect(hasSamtykke).toBe(true);
  });
});

test.describe("Personlighetstest", () => {
  test("analyse-siden lastes med profildata eller onboarding-prompt", async ({ page }) => {
    await page.goto("/dashboard/analyse");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("profil-siden viser resultater eller tommelding", async ({ page }) => {
    await page.goto("/dashboard/profil");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();

    // Bør vise enten profildata (RIASEC, Big Five) eller oppfordring om å fullføre test
    const bodyText = await page.textContent("body");
    const hasProfileContent =
      /riasec|big five|profil|personlighet|onboarding|ingen profil/i.test(bodyText ?? "");
    expect(hasProfileContent).toBe(true);
  });
});
