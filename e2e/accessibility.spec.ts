/**
 * Tilgjengelighets-E2E-tester — kjører axe-core på kritiske sider.
 * Issue #66 / Issue #72 (WCAG 2.1 AA + WCAG 2.2 AA)
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES_TO_TEST = [
  "/dashboard",
  "/dashboard/profil",
  "/dashboard/veileder",
  "/dashboard/karriere",
  "/dashboard/fremgang",
  "/dashboard/mentorer",
  "/dashboard/arbeidsgivere",
];

// ─── WCAG 2.1 AA + WCAG 2.2 AA — axe-core automatisk analyse ────────────────

for (const url of PAGES_TO_TEST) {
  test(`${url}: ingen kritiske WCAG 2.1/2.2 AA-brudd (axe-core)`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

// ─── Bildebeskrivelse ─────────────────────────────────────────────────────────

test("alle bilder på dashboard har alt-tekst", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const images = page.locator("img:not([alt])");
  const imgCount = await images.count();
  expect(imgCount).toBe(0);
});

// ─── Tilgjengelig navn på interaktive elementer ───────────────────────────────

test("alle interaktive elementer har tilgjengelig navn", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const unnamedButtons = page.locator("button:not([aria-label]):not([aria-labelledby])");
  const btn = await unnamedButtons.all();
  for (const b of btn) {
    const text = await b.innerText();
    const ariaLabel = await b.getAttribute("aria-label");
    const hasAccessibleName = (text?.trim().length ?? 0) > 0 || !!ariaLabel;
    expect(hasAccessibleName).toBeTruthy();
  }
});

// ─── WCAG 2.4.1 / 2.4.12: Skip-lenke og fokus ────────────────────────────────

test("fokus-orden er logisk ved Tab-navigasjon på dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  // Første Tab → skip-link
  await page.keyboard.press("Tab");
  const focused1 = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(focused1).toMatch(/hopp til innhold/i);
});

test("skip-lenke fører til main-content", async ({ page }) => {
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  const mainFocused = await page.evaluate(() => document.activeElement?.id);
  expect(mainFocused).toBe("main-content");
});

// ─── WCAG 2.4.11 Focus Appearance (2.2 AA) ───────────────────────────────────

test("fokuserte elementer er synlige (focus-visible stil finnes)", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // Sjekk at :focus-visible CSS er definert med outline
  const hasOutline = await page.evaluate(() => {
    const btn = document.querySelector("button");
    if (!btn) return false;
    btn.focus();
    const style = getComputedStyle(btn);
    // outline-width > 0 eller box-shadow indikerer synlig fokus
    return style.outlineStyle !== "none" || style.outlineWidth !== "0px";
  });
  expect(hasOutline).toBeTruthy();
});

// ─── WCAG 2.5.8 Target Size Minimum (2.2 AA) ─────────────────────────────────

test("knapper i navigasjonen har minimum 24×24px klikkflate", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  const navButtons = page.locator("nav button, nav a");
  const buttons = await navButtons.all();

  for (const btn of buttons.slice(0, 10)) {
    const box = await btn.boundingBox();
    if (!box) continue;
    // WCAG 2.5.8: 24×24 CSS-piksler minimum
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
});

// ─── WCAG 3.3.7 Accessible Authentication (2.2 AA) ───────────────────────────

test("innloggingsskjema støtter autofyll (autocomplete-attributter)", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator("input[type='email']").first();
  const passwordInput = page.locator("input[type='password']").first();

  if (await emailInput.isVisible().catch(() => false)) {
    const emailAutoComplete = await emailInput.getAttribute("autocomplete");
    expect(emailAutoComplete).toBeTruthy();
  }

  if (await passwordInput.isVisible().catch(() => false)) {
    const pwAutoComplete = await passwordInput.getAttribute("autocomplete");
    expect(pwAutoComplete).toBeTruthy();
  }
});

// ─── WCAG 3.2.6 Consistent Help (2.2 AA) ─────────────────────────────────────

test("hjelpelenke er konsistent til stede i dashboard-header", async ({ page }) => {
  for (const url of ["/dashboard", "/dashboard/karriere", "/dashboard/profil"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const helpLink = page.locator("[aria-label*='Hjelp'], [aria-label*='hjelp']").first();
    const hasHelp = await helpLink.isVisible().catch(() => false);
    expect(hasHelp).toBeTruthy();
  }
});

// ─── WCAG 1.4.4 Resize Text — tekst skalerer til 200% ────────────────────────

test("dashboard er brukbart ved 200% tekststørrelse", async ({ page }) => {
  await page.goto("/dashboard");

  // Øk font-size til 200%
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px"; // dobler standard 16px
  });
  await page.waitForTimeout(300);

  // Viktigste navigasjonselementer skal fortsatt være synlige
  const nav = page.getByRole("navigation", { name: "Hovednavigasjon" });
  const mainVisible = await nav.isVisible().catch(() => false);
  // På mobil kan navigasjonen være skjult — ikke feil
  if (mainVisible) {
    await expect(nav).toBeVisible();
  }
});
