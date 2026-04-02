/**
 * Komponenttester for ConsentBanner (Issue #98)
 *
 * Tester GDPR-samtykkebanner.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentBanner, hasConsent } from "../consent-banner";

afterEach(cleanup);

describe("ConsentBanner", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("viser banner når samtykke ikke er gitt", async () => {
    await act(async () => {
      render(<ConsentBanner />);
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/informasjonskapsler og analyse/)).toBeInTheDocument();
  });

  it("skjuler banner når samtykke allerede er akseptert", async () => {
    store["consent"] = "accepted";
    await act(async () => {
      render(<ConsentBanner />);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("skjuler banner når samtykke allerede er avslått", async () => {
    store["consent"] = "declined";
    await act(async () => {
      render(<ConsentBanner />);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("lagrer 'declined' og skjuler banner ved avslag", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<ConsentBanner />);
    });

    await user.click(screen.getByText("Avslå"));

    expect(store["consent"]).toBe("declined");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("har Godta og Avslå-knapper", async () => {
    await act(async () => {
      render(<ConsentBanner />);
    });
    expect(screen.getByText("Godta")).toBeInTheDocument();
    expect(screen.getByText("Avslå")).toBeInTheDocument();
  });

  it("har riktig aria-attributter", async () => {
    await act(async () => {
      render(<ConsentBanner />);
    });
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "consent-title");
    expect(dialog).toHaveAttribute("aria-describedby", "consent-desc");
  });
});

describe("hasConsent", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returnerer false når ingen samtykke er gitt", () => {
    expect(hasConsent()).toBe(false);
  });

  it("returnerer true når samtykke er akseptert", () => {
    store["consent"] = "accepted";
    expect(hasConsent()).toBe(true);
  });

  it("returnerer false når samtykke er avslått", () => {
    store["consent"] = "declined";
    expect(hasConsent()).toBe(false);
  });
});
