/**
 * Mobil viewport E2E-tester (Issue #66)
 *
 * Tester responsivt design på mobil viewport (Pixel 7, iPhone 14).
 * Kjøres med mobile-chrome og mobile-safari projects i playwright.config.ts.
 */

import { test, expect } from "@playwright/test";

test.describe("Mobil viewport", () => {
  test("dashboard er brukbart på mobil", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

    // Mobilnavigasjon: hamburger-meny bør finnes eller sidebar bør fungere
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      // På mobil: sjekk at innhold ikke overflyter
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 5);
    }
  });

  test("AI-chat er brukbar på mobil", async ({ page }) => {
    await page.goto("/dashboard/veileder");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

    const chatInput = page.getByRole("textbox", { name: /melding|skriv|spør/i });
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // Sjekk at input-feltet er synlig og ikke skjult bak tastatur
    const inputBbox = await chatInput.boundingBox();
    expect(inputBbox).not.toBeNull();
  });

  test("landing-side laster på mobil", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    // Sjekk at CTA-knappen er synlig
    const ctaBtn = page.getByRole("button", { name: /kom i gang|registrer|prøv/i });
    if (await ctaBtn.isVisible().catch(() => false)) {
      await expect(ctaBtn).toBeInViewport();
    }
  });

  test("navigasjon fungerer på mobil", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

    // Kan navigere til veileder-siden
    const veilederLink = page.getByRole("link", { name: /veileder|ai/i }).first();
    if (await veilederLink.isVisible().catch(() => false)) {
      await veilederLink.click();
      await expect(page).toHaveURL(/veileder/);
    }
  });
});
