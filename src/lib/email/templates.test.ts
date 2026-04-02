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
