/**
 * Autentiserings-setup for Playwright E2E-tester.
 * Logger inn med testbruker og lagrer session-state.
 *
 * Krever miljøvariabler:
 *   E2E_TEST_EMAIL    — testbrukerens e-post
 *   E2E_TEST_PASSWORD — testbrukerens passord
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    console.warn("E2E_TEST_EMAIL / E2E_TEST_PASSWORD ikke satt — hopper over autentisering");
    // Lagre tom auth-state slik at avhengige tester kan kjøre uten innlogging
    await page.context().storageState({ path: authFile });
    return;
  }

  await page.goto("/login");

  // Vent på at innloggingsskjema er lastet
  await page.getByLabel(/e-post/i).fill(email);
  await page.getByLabel(/passord/i).fill(password);
  await page.getByRole("button", { name: /logg inn/i }).click();

  // Vent på redirect til dashboard
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/dashboard/);

  // Lagre autentisert state
  await page.context().storageState({ path: authFile });
});
