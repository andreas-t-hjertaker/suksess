/**
 * Komponenttester for AiDisclosure (Issue #98)
 *
 * Tester EU AI Act Art. 52-transparenskomponenten.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiDisclosure } from "../ai-disclosure";

afterEach(cleanup);

describe("AiDisclosure", () => {
  it("rendrer AI-transparensvarsel på bokmål", () => {
    render(<AiDisclosure featureId="career-advisor" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/AI-karriereveileder/)).toBeInTheDocument();
    expect(screen.getByText(/kunstig intelligens/)).toBeInTheDocument();
  });

  it("rendrer på nynorsk når locale=nn", () => {
    render(<AiDisclosure featureId="career-advisor" locale="nn" />);
    expect(screen.getByText(/AI-karriererettleiar/)).toBeInTheDocument();
  });

  it("rendrer på nordsamisk når locale=se", () => {
    render(<AiDisclosure featureId="career-advisor" locale="se" />);
    expect(screen.getByText(/AI-karrierrabagadalliiguin/)).toBeInTheDocument();
  });

  it("viser utvidbar seksjon i standard-modus", () => {
    render(<AiDisclosure featureId="career-advisor" />);
    expect(screen.getByText(/Mer om hvordan AI brukes/)).toBeInTheDocument();
  });

  it("skjuler utvidbar seksjon i kompakt modus", () => {
    render(<AiDisclosure featureId="career-advisor" compact />);
    expect(screen.queryByText(/Mer om hvordan AI brukes/)).not.toBeInTheDocument();
  });

  it("viser detaljer når bruker klikker utvidbar seksjon", async () => {
    const user = userEvent.setup();
    render(<AiDisclosure featureId="career-advisor" />);

    await user.click(screen.getByText(/Mer om hvordan AI brukes/));

    expect(screen.getByText(/Formål/)).toBeInTheDocument();
    expect(screen.getByText(/Begrensninger/)).toBeInTheDocument();
    expect(screen.getByText(/Dine rettigheter/)).toBeInTheDocument();
    expect(screen.getByText(/personvern@suksess.no/)).toBeInTheDocument();
  });

  it("skjuler detaljer når bruker klikker igjen", async () => {
    const user = userEvent.setup();
    render(<AiDisclosure featureId="career-advisor" />);

    await user.click(screen.getByText(/Mer om hvordan AI brukes/));
    expect(screen.getByText(/Formål/)).toBeInTheDocument();

    await user.click(screen.getByText(/Skjul detaljer/));
    expect(screen.queryByText(/Formål/)).not.toBeInTheDocument();
  });

  it("viser ikke utvidbar knapp for ukjent funksjon", () => {
    render(<AiDisclosure featureId="nonexistent-feature" />);
    expect(screen.queryByText(/Mer om hvordan AI brukes/)).not.toBeInTheDocument();
  });

  it("har riktig aria-label", () => {
    render(<AiDisclosure featureId="career-advisor" />);
    expect(screen.getByLabelText("AI-transparensvarsel")).toBeInTheDocument();
  });
});
