import { describe, it, expect } from "vitest";
import {
  getAuthErrorMessage,
  isNetworkError,
  isUserCancelledError,
} from "./auth-errors";

/**
 * Tester for Firebase Auth feilhåndtering (#180).
 *
 * Verifiserer at Firebase-feilkoder mappes korrekt til norske meldinger,
 * og at nettverks-/avbruddsdeteksjon fungerer.
 */

describe("getAuthErrorMessage", () => {
  it("mapper kjente Firebase-feilkoder til norske meldinger", () => {
    const cases: Array<{ code: string; expected: string }> = [
      { code: "auth/user-not-found", expected: "Ingen bruker funnet med denne e-postadressen." },
      { code: "auth/wrong-password", expected: "Feil passord." },
      { code: "auth/invalid-credential", expected: "Ugyldig e-post eller passord." },
      { code: "auth/email-already-in-use", expected: "Denne e-postadressen er allerede i bruk." },
      { code: "auth/weak-password", expected: "Passordet må være minst 6 tegn." },
      { code: "auth/invalid-email", expected: "Ugyldig e-postadresse." },
      { code: "auth/too-many-requests", expected: "For mange forsøk. Prøv igjen senere." },
      { code: "auth/popup-closed-by-user", expected: "Innloggingsvinduet ble lukket. Prøv igjen." },
      { code: "auth/user-disabled", expected: "Denne kontoen er deaktivert. Kontakt skolens administrator." },
      { code: "auth/expired-action-code", expected: "Lenken har utløpt. Be om en ny." },
      { code: "auth/invalid-action-code", expected: "Ugyldig lenke. Be om en ny." },
    ];

    for (const { code, expected } of cases) {
      expect(getAuthErrorMessage({ code })).toBe(expected);
    }
  });

  it("returnerer generisk melding for ukjent feilkode", () => {
    expect(getAuthErrorMessage({ code: "auth/unknown-error" })).toBe(
      "Noe gikk galt. Prøv igjen."
    );
  });

  it("returnerer generisk melding for ikke-Firebase-feil", () => {
    expect(getAuthErrorMessage(new Error("random error"))).toBe(
      "Noe gikk galt. Prøv igjen."
    );
  });

  it("returnerer nettverksmelding for nettverksfeil", () => {
    const error = new Error("Network request failed");
    expect(getAuthErrorMessage(error)).toBe(
      "Ingen nettverkstilkobling. Sjekk internett og prøv igjen."
    );
  });

  it("returnerer nettverksmelding for Firebase-nettverkskode", () => {
    expect(getAuthErrorMessage({ code: "auth/network-request-failed" })).toBe(
      "Ingen nettverkstilkobling. Sjekk internett og prøv igjen."
    );
  });

  it("håndterer null og undefined", () => {
    expect(getAuthErrorMessage(null)).toBe("Noe gikk galt. Prøv igjen.");
    expect(getAuthErrorMessage(undefined)).toBe("Noe gikk galt. Prøv igjen.");
  });

  it("håndterer streng som feil", () => {
    expect(getAuthErrorMessage("noe feilet")).toBe("Noe gikk galt. Prøv igjen.");
  });
});

describe("isNetworkError", () => {
  it("oppdager nettverksfeil fra Error.message", () => {
    expect(isNetworkError(new Error("network error"))).toBe(true);
    expect(isNetworkError(new Error("Network request failed"))).toBe(true);
  });

  it("oppdager nettverksfeil fra Firebase-kode", () => {
    expect(isNetworkError({ code: "auth/network-request-failed" })).toBe(true);
  });

  it("returnerer false for andre feil", () => {
    expect(isNetworkError(new Error("user not found"))).toBe(false);
    expect(isNetworkError({ code: "auth/wrong-password" })).toBe(false);
  });

  it("returnerer false for null/undefined", () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe("isUserCancelledError", () => {
  it("gjenkjenner popup-lukket-av-bruker", () => {
    expect(isUserCancelledError({ code: "auth/popup-closed-by-user" })).toBe(true);
  });

  it("gjenkjenner avbrutt popup-forespørsel", () => {
    expect(isUserCancelledError({ code: "auth/cancelled-popup-request" })).toBe(true);
  });

  it("gjenkjenner redirect avbrutt av bruker", () => {
    expect(isUserCancelledError({ code: "auth/redirect-cancelled-by-user" })).toBe(true);
  });

  it("returnerer false for andre feil", () => {
    expect(isUserCancelledError({ code: "auth/wrong-password" })).toBe(false);
    expect(isUserCancelledError(new Error("noe annet"))).toBe(false);
  });

  it("returnerer false for null/undefined", () => {
    expect(isUserCancelledError(null)).toBe(false);
    expect(isUserCancelledError(undefined)).toBe(false);
  });
});
