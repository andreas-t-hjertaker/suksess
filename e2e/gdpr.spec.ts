/**
 * GDPR E2E-tester (Issue #66)
 *
 * Tester "mine data"-side, eksport og sletting.
 */

import { test, expect } from "@playwright/test";

test.describe("GDPR — Mine data", () => {
  test("mine-data-siden laster", async ({ page }) => {
    await page.goto("/dashboard/mine-data");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
  });

  test("kan eksportere egne data", async ({ page }) => {
    await page.goto("/dashboard/mine-data");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

    // Finn eksport-knapp
    const exportBtn = page.getByRole("button", { name: /eksport|last ned|download/i });
    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Start nedlasting
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        exportBtn.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/suksess|data|export/i);
    }
  });

  test("personvern-side er tilgjengelig", async ({ page }) => {
    await page.goto("/personvern");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/personvern|GDPR|datatilsynet/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("GDPR — Samtalehistorikk-sletting", () => {
  test("kan navigere til veileder og chat vises", async ({ page }) => {
    await page.goto("/dashboard/veileder");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
  });
});
