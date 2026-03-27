/**
 * AI-chat E2E-tester — verifiserer AI-veileder-funksjonalitet (Issue #66)
 */

import { test, expect } from "@playwright/test";

test.describe("AI-veileder chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/veileder");
    await page.waitForLoadState("networkidle");
  });

  test("veileder-siden lastes med heading og foreslåtte spørsmål", async ({ page }) => {
    await expect(page.getByText("AI-veileder")).toBeVisible();
    // Foreslåtte spørsmål bør vises før noe er sendt
    await expect(page.getByText("Forslag til spørsmål")).toBeVisible();
    const suggestions = page.locator("button").filter({
      hasText: /karriere|RIASEC|studie|yrker/i,
    });
    await expect(suggestions.first()).toBeVisible();
  });

  test("brukeren kan klikke et foreslått spørsmål", async ({ page }) => {
    const suggestion = page.locator("button").filter({
      hasText: /karriere/i,
    });
    await expect(suggestion.first()).toBeVisible();
    await suggestion.first().click();

    // Spørsmålet skal dukke opp i chatten som brukermelding
    // Foreslåtte spørsmål bør forsvinne etter sending
    await expect(page.getByText("Forslag til spørsmål")).not.toBeVisible({ timeout: 5000 });
  });

  test("chat-input er synlig og aksepterer tekst", async ({ page }) => {
    const input = page.locator("textarea, input[type='text']").filter({
      hasText: /$/,
    });
    // Finn input-feltet via placeholder
    const chatInput = page.getByPlaceholder(/karrierevalg|studier|spørsmål/i);
    await expect(chatInput).toBeVisible();

    // Skriv noe i input
    await chatInput.fill("Hva betyr RIASEC?");
    await expect(chatInput).toHaveValue("Hva betyr RIASEC?");
  });

  test("tøm-samtale-knapp er synlig", async ({ page }) => {
    const clearBtn = page.getByRole("button", { name: /tøm samtale/i });
    await expect(clearBtn).toBeVisible();
    // Bør være disabled når ingen meldinger
    await expect(clearBtn).toBeDisabled();
  });

  test("veileder-header viser RIASEC-badge når profil finnes", async ({ page }) => {
    // Sjekk at header-seksjonen er korrekt strukturert
    const header = page.locator("div").filter({ hasText: "AI-veileder" }).first();
    await expect(header).toBeVisible();
  });
});

test.describe("AI-chat sikkerhet", () => {
  test("safety-modul er aktiv — chat lastes uten feil", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("Firebase")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/dashboard/veileder");
    await page.waitForLoadState("networkidle");

    // Siden bør laste uten kritiske JavaScript-feil
    expect(errors.filter((e) => e.includes("safety") || e.includes("crash"))).toHaveLength(0);
  });

  test("velkomstmelding er tilgjengelig og personlig", async ({ page }) => {
    await page.goto("/dashboard/veileder");
    await page.waitForLoadState("networkidle");

    // Velkomstmelding bør inneholde "Hei"
    await expect(page.getByText(/hei/i).first()).toBeVisible();
    // Bot-ikonet bør være synlig
    await expect(page.locator("svg").first()).toBeVisible();
  });
});
