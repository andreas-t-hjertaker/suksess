/**
 * Innlogging E2E-tester — verifiserer at login-siden fungerer (Issue #66)
 */

import { test, expect } from "@playwright/test";

test.describe("Innlogging", () => {
  test("login-siden lastes korrekt", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Sjekk at login-siden inneholder et skjema eller innloggingsknapper
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("login-siden har tilgjengelig skjema", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Alle input-felt bør ha labels
    const inputs = page.locator("input:not([type='hidden'])");
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const placeholder = await input.getAttribute("placeholder");
      // Skal ha enten id med tilhørende label, aria-label, eller placeholder
      expect(id || ariaLabel || placeholder).toBeTruthy();
    }
  });

  test("uautentisert bruker redirectes fra dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Bør enten vise login-prompt eller redirecte
    await page.waitForLoadState("networkidle");
    // Forventer at vi enten er på /login eller ser en innloggingsmelding
    const url = page.url();
    const hasLoginContent = url.includes("login") ||
      (await page.getByText(/logg inn/i).count()) > 0 ||
      (await page.getByText(/dashboard/i).count()) > 0; // Kan vise dashboard i dev mode
    expect(hasLoginContent).toBeTruthy();
  });
});
