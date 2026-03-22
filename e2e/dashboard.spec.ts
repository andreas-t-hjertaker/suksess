/**
 * Dashboard E2E-tester — verifiserer at hovedelementene i dashboardet lastes korrekt.
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("laster dashboard etter innlogging", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
    // Sjekk at header er synlig
    await expect(page.getByRole("banner")).toBeVisible();
    // Sjekk at sidebar finnes
    await expect(page.getByRole("navigation", { name: /hovednavigasjon/i })).toBeVisible();
  });

  test("skip-link er tilgjengelig for tastaturbrukere", async ({ page }) => {
    await page.goto("/dashboard");
    // Tab til skip-link
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Hopp til innhold");
    await expect(skipLink).toBeFocused();
  });

  test("theme toggle endrer tema", async ({ page }) => {
    await page.goto("/dashboard");
    const html = page.locator("html");
    // Registrer nåværende tema
    const initialClass = await html.getAttribute("class");
    // Klikk theme toggle
    await page.getByRole("button", { name: /bytt tema/i }).click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("varslingklokke er synlig og klikkbar", async ({ page }) => {
    await page.goto("/dashboard");
    const bell = page.getByRole("button", { name: /varslinger/i });
    await expect(bell).toBeVisible();
    await bell.click();
    // Dropdown skal åpnes
    await expect(page.getByRole("dialog", { name: /varslinger/i })).toBeVisible();
  });
});
