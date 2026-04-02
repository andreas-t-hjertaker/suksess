import { describe, it, expect } from "vitest";
import {
  welcomeEmail,
  onboardingCompleteEmail,
  subscriptionConfirmEmail,
  paymentFailedEmail,
  schoolInviteEmail,
  weeklyDigestEmail,
  dataExportReadyEmail,
  passwordResetEmail,
  parentConsentRequestEmail,
  parentInviteEmail,
} from "./templates";

describe("E-postmaler", () => {
  it("welcomeEmail inneholder navn og dashboard-lenke", () => {
    const email = welcomeEmail("Kari");
    expect(email.subject).toBe("Velkommen til Suksess!");
    expect(email.html).toContain("Hei Kari");
    expect(email.html).toContain("suksess.no/dashboard");
    expect(email.text).toContain("Kari");
  });

  it("welcomeEmail håndterer tomt navn", () => {
    const email = welcomeEmail("");
    expect(email.html).toContain("Hei der");
  });

  it("onboardingCompleteEmail lenker til analyse", () => {
    const email = onboardingCompleteEmail("Ole");
    expect(email.subject).toBe("Profilen din er klar!");
    expect(email.html).toContain("dashboard/analyse");
  });

  it("subscriptionConfirmEmail viser plannavn", () => {
    const email = subscriptionConfirmEmail("Per", "Pro Student");
    expect(email.subject).toContain("Pro Student");
    expect(email.html).toContain("Pro Student");
  });

  it("paymentFailedEmail lenker til abonnement", () => {
    const email = paymentFailedEmail("Lisa");
    expect(email.subject).toContain("Betaling feilet");
    expect(email.html).toContain("dashboard/abonnement");
  });

  it("schoolInviteEmail inneholder skolenavn og invitasjonslenke", () => {
    const email = schoolInviteEmail("Nydalen VGS", "https://suksess.no/invite/abc");
    expect(email.subject).toContain("Nydalen VGS");
    expect(email.html).toContain("https://suksess.no/invite/abc");
    expect(email.text).toContain("Nydalen VGS");
  });

  it("weeklyDigestEmail viser statistikk", () => {
    const email = weeklyDigestEmail("Kari", { xpEarned: 150, testsCompleted: 2, careersExplored: 5 });
    expect(email.html).toContain("150");
    expect(email.html).toContain("2");
    expect(email.html).toContain("5");
    expect(email.subject).toContain("oppsummering");
  });

  it("dataExportReadyEmail inneholder nedlastingslenke", () => {
    const email = dataExportReadyEmail("Ole", "https://storage.example.com/export.zip");
    expect(email.html).toContain("https://storage.example.com/export.zip");
    expect(email.html).toContain("24 timer");
  });

  it("passwordResetEmail inneholder tilbakestillingslenke", () => {
    const email = passwordResetEmail("Kari", "https://suksess.no/reset?token=xyz");
    expect(email.html).toContain("https://suksess.no/reset?token=xyz");
    expect(email.html).toContain("1 time");
  });

  it("alle maler har gyldig HTML-struktur", () => {
    const templates = [
      welcomeEmail("Test"),
      onboardingCompleteEmail("Test"),
      subscriptionConfirmEmail("Test", "Pro"),
      paymentFailedEmail("Test"),
      schoolInviteEmail("Skole", "https://example.com"),
      weeklyDigestEmail("Test", { xpEarned: 0, testsCompleted: 0, careersExplored: 0 }),
      dataExportReadyEmail("Test", "https://example.com"),
      passwordResetEmail("Test", "https://example.com"),
    ];
    for (const t of templates) {
      expect(t.html).toContain("<!DOCTYPE html>");
      expect(t.html).toContain("</html>");
      expect(t.subject.length).toBeGreaterThan(0);
      expect(t.text.length).toBeGreaterThan(0);
    }
  });

  it("alle maler inneholder personvernerklæring-lenke", () => {
    const templates = [
      welcomeEmail("Test"),
      onboardingCompleteEmail("Test"),
      subscriptionConfirmEmail("Test", "Pro"),
    ];
    for (const t of templates) {
      expect(t.html).toContain("personvern");
    }
  });
});

// ─── Foresatt-e-postmaler (#106) ─────────────────────────────────────────────

describe("parentConsentRequestEmail (#106)", () => {
  it("inneholder elevnavn og samtykke-URL", () => {
    const email = parentConsentRequestEmail("Kari", "https://suksess.no/consent/abc123");
    expect(email.subject).toContain("Samtykke");
    expect(email.html).toContain("Kari");
    expect(email.html).toContain("https://suksess.no/consent/abc123");
    expect(email.text).toContain("Kari");
    expect(email.text).toContain("https://suksess.no/consent/abc123");
  });

  it("nevner GDPR og under 16 år", () => {
    const email = parentConsentRequestEmail("Ole", "https://example.com");
    expect(email.html).toContain("under 16 år");
    expect(email.html).toContain("GDPR");
  });

  it("beskriver hva foresatt godkjenner", () => {
    const email = parentConsentRequestEmail("Ole", "https://example.com");
    expect(email.html).toContain("personlighetstestresultater");
    expect(email.html).toContain("AI-drevet karriereveiledning");
    expect(email.html).toContain("rådgiver");
  });

  it("nevner 7 dagers gyldighet", () => {
    const email = parentConsentRequestEmail("Ole", "https://example.com");
    expect(email.html).toContain("7 dager");
    expect(email.text).toContain("7 dager");
  });

  it("håndterer tomt elevnavn", () => {
    const email = parentConsentRequestEmail("", "https://example.com");
    expect(email.html).toContain("Eleven");
    expect(email.html).not.toContain("Hei ");
  });

  it("har gyldig HTML-struktur", () => {
    const email = parentConsentRequestEmail("Test", "https://example.com");
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain("</html>");
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.text.length).toBeGreaterThan(0);
  });
});

describe("parentInviteEmail (#106)", () => {
  it("inneholder elevnavn og formatert koblingskode", () => {
    const email = parentInviteEmail("Kari", "ABC123");
    expect(email.subject).toContain("Kari");
    expect(email.html).toContain("ABC 123");
    expect(email.text).toContain("ABC 123");
  });

  it("inneholder steg-for-steg instruksjoner", () => {
    const email = parentInviteEmail("Ole", "XYZ789");
    expect(email.html).toContain("suksess.no/login");
    expect(email.html).toContain("Foresatt-portal");
    expect(email.html).toContain("koblingskoden");
  });

  it("inneholder personvernnotis", () => {
    const email = parentInviteEmail("Ole", "XYZ789");
    expect(email.html).toContain("Personvern");
    expect(email.html).toContain("aldri synlige for foresatte");
  });

  it("nevner 30 minutters gyldighet", () => {
    const email = parentInviteEmail("Ole", "XYZ789");
    expect(email.html).toContain("30 minutter");
    expect(email.text).toContain("30 minutter");
  });

  it("håndterer tomt elevnavn", () => {
    const email = parentInviteEmail("", "ABC123");
    expect(email.html).toContain("Eleven");
    expect(email.subject).toContain("Eleven");
  });

  it("har gyldig HTML-struktur", () => {
    const email = parentInviteEmail("Test", "ABC123");
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain("</html>");
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.text.length).toBeGreaterThan(0);
  });
});
