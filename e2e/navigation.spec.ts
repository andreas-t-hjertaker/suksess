/**
 * Navigasjons-E2E-tester — verifiserer at alle hovednoder i navigasjonen fungerer.
 */

import { test, expect } from "@playwright/test";

const ROUTES = [
  { path: "/dashboard", heading: /dashboard/i },
  { path: "/dashboard/profil", heading: /profil/i },
  { path: "/dashboard/karriere", heading: /karriere/i },
  { path: "/dashboard/karakterer", heading: /karakterer/i },
  { path: "/dashboard/fremgang", heading: /fremgang/i },
  { path: "/dashboard/mine-data", heading: /mine data/i },
];

for (const { path, heading } of ROUTES) {
  test(`${path} lastes uten feil`, async ({ page }) => {
    await page.goto(path);
    // Ingen console-errors med "Error:" prefix
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.waitForLoadState("networkidle");
    // Sjekk at siden inneholder forventet heading
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();

    // Aksepter kun kjente Firebase-advarsler i errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("Firebase") && !e.includes("firestore")
    );
    expect(criticalErrors).toHaveLength(0);
  });
}

test("404-side vises ved ugyldig URL", async ({ page }) => {
  const response = await page.goto("/dashboard/finnes-ikke");
  // Next.js returnerer 404
  expect(response?.status()).toBe(404);
});
