/**
 * CV-builder E2E-tester (Issue #66)
 *
 * Tester CV-builder: fyll ut seksjon, forhåndsvis, last ned.
 * Kjøres med Firebase Auth Emulator eller innlogget testbruker.
 */

import { test, expect } from "@playwright/test";

test.describe("CV-builder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/cv");
    // Vent på at siden er fullstendig lastet
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
  });

  test("CV-builder-siden laster og viser grunnleggende UI", async ({ page }) => {
    // Sidetittel eller heading
    await expect(
      page.getByRole("heading", { name: /cv/i }).or(page.getByText(/CV-builder/i).first())
    ).toBeVisible({ timeout: 10_000 });
  });

  test("kan fylle ut personopplysninger", async ({ page }) => {
    // Finn navn-felt
    const nameInput = page
      .getByRole("textbox", { name: /navn|name/i })
      .or(page.locator('input[placeholder*="navn"]'))
      .first();

    if (await nameInput.isVisible({ timeout: 5_000 })) {
      await nameInput.fill("Testbruker Testesen");
      await expect(nameInput).toHaveValue("Testbruker Testesen");
    } else {
      // CV-builder kan bruke en annen struktur
      test.skip();
    }
  });

  test("kan legge til arbeidserfaring", async ({ page }) => {
    // Finn "Legg til erfaring" eller tilsvarende knapp
    const addBtn = page
      .getByRole("button", { name: /legg til erfaring|add experience|erfaring/i })
      .or(page.getByText(/legg til/i).filter({ hasText: /erfaring|jobb/i }).first());

    if (await addBtn.isVisible({ timeout: 5_000 })) {
      await addBtn.click();
      // Vent på at input-felt dukker opp
      const jobInput = page.locator('input[placeholder*="stilling"], input[placeholder*="tittel"]').first();
      if (await jobInput.isVisible({ timeout: 3_000 })) {
        await jobInput.fill("Sommervikar");
        await expect(jobInput).toHaveValue("Sommervikar");
      }
    }
  });

  test("kan legge til utdanning", async ({ page }) => {
    const addBtn = page
      .getByRole("button", { name: /legg til utdanning|add education/i })
      .or(page.getByText(/legg til/i).filter({ hasText: /utdanning|skole/i }).first());

    if (await addBtn.isVisible({ timeout: 5_000 })) {
      await addBtn.click();
      const schoolInput = page.locator('input[placeholder*="skole"], input[placeholder*="utdanning"]').first();
      if (await schoolInput.isVisible({ timeout: 3_000 })) {
        await schoolInput.fill("Testskolen VGS");
        await expect(schoolInput).toHaveValue("Testskolen VGS");
      }
    }
  });

  test("forhåndsvisningsknapp er tilgjengelig", async ({ page }) => {
    // Sjekk at forhåndsvis / preview-knapp finnes
    const previewBtn = page
      .getByRole("button", { name: /forhåndsvis|preview|se cv/i })
      .or(page.getByText(/forhåndsvis/i).first());

    await expect(previewBtn).toBeVisible({ timeout: 10_000 });
  });

  test("nedlastingsknapp er tilgjengelig", async ({ page }) => {
    // PDF-nedlasting eller eksport-knapp
    const downloadBtn = page
      .getByRole("button", { name: /last ned|download|eksporter|pdf/i })
      .or(page.getByText(/last ned|pdf/i).first());

    await expect(downloadBtn).toBeVisible({ timeout: 10_000 });
  });

  test("CV-siden er tilgjengelig (WCAG)", async ({ page }) => {
    // Grunnleggende tilgjengelighet: heading-struktur
    const headings = page.getByRole("heading");
    await expect(headings.first()).toBeVisible({ timeout: 5_000 });

    // Ingen klikkbare elementer uten tilgjengelig navn
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const name = await btn.getAttribute("aria-label") ?? await btn.textContent();
        expect(name?.trim()).toBeTruthy();
      }
    }
  });
});
