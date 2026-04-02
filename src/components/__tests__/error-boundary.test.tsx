/**
 * Komponenttester for ErrorBoundary (Issue #98)
 *
 * Tester at ErrorBoundary fanger feil og viser fallback-UI.
 */

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ErrorBoundary } from "../error-boundary";

afterEach(cleanup);

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test-feil");
  }
  return <div>Alt fungerer</div>;
}

// Suppress console.error from React during error boundary testing
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe("ErrorBoundary", () => {
  it("rendrer children når ingen feil oppstår", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Alt fungerer")).toBeInTheDocument();
  });

  it("viser feilmelding når barn kaster feil", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Noe gikk galt")).toBeInTheDocument();
    expect(screen.getByText("Test-feil")).toBeInTheDocument();
  });

  it("viser 'Last inn på nytt'-knapp", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Last inn på nytt")).toBeInTheDocument();
  });

  it("viser custom fallback når oppgitt", () => {
    render(
      <ErrorBoundary fallback={<div>Egendefinert feil-UI</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Egendefinert feil-UI")).toBeInTheDocument();
    expect(screen.queryByText("Noe gikk galt")).not.toBeInTheDocument();
  });

  it("viser feilbeskrivelse til brukeren", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(
      screen.getByText(/uventet feil har oppstått/)
    ).toBeInTheDocument();
  });
});
