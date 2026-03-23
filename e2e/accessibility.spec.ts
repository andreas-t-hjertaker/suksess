/**
 * Tilgjengelighets-E2E-tester — kjører axe-core på kritiske sider.
 * Issue #66 / Issue #41 (WCAG 2.1 AA)
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES_TO_TEST = [
  "/dashboard",
  "/dashboard/profil",
  "/dashboard/veileder",
  "/dashboard/karriere",
  "/dashboard/fremgang",
];

for (const url of PAGES_TO_TEST) {
  test(`${url}: ingen kritiske WCAG 2.1 AA-brudd (axe-core)`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test("alle bilder på dashboard har alt-tekst", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const images = page.locator("img:not([alt])");
  const imgCount = await images.count();
  expect(imgCount).toBe(0);
});

test("alle interaktive elementer har tilgjengelig navn", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // Alle knapper har tilgjengelig navn
  const unnamedButtons = page.locator("button:not([aria-label]):not([aria-labelledby])");
  const btn = await unnamedButtons.all();
  for (const b of btn) {
    const text = await b.innerText();
    const ariaLabel = await b.getAttribute("aria-label");
    const hasAccessibleName = (text?.trim().length ?? 0) > 0 || ariaLabel;
    expect(hasAccessibleName).toBeTruthy();
  }
});

test("fokus-orden er logisk ved Tab-navigasjon på dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  // Første Tab → skip-link
  await page.keyboard.press("Tab");
  const focused1 = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(focused1).toMatch(/hopp til innhold/i);
});
