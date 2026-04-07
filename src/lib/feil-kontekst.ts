/**
 * Feil-kontekst — global event bus for å trigge feilrapport-dialog.
 *
 * Brukes av ErrorBoundary og andre feilhåndterere for å automatisk
 * åpne feedback-dialogen med forhåndsutfylt feilinformasjon.
 */

export type FeilRapportData = {
  feilmelding: string;
  stackTrace?: string;
  komponentStack?: string;
};

type FeilRapportLytter = (data: FeilRapportData) => void;

const lyttere: FeilRapportLytter[] = [];

/**
 * Registrer en lytter som kalles når en feilrapport utløses.
 * Returnerer en cleanup-funksjon for å fjerne lytteren.
 */
export function lyttPaaFeilrapport(lytter: FeilRapportLytter): () => void {
  lyttere.push(lytter);
  return () => {
    const idx = lyttere.indexOf(lytter);
    if (idx >= 0) lyttere.splice(idx, 1);
  };
}

/**
 * Utløs feilrapport — åpner feedback-dialogen med feilinformasjon.
 * Kalles fra ErrorBoundary, globale feilhåndterere, osv.
 */
export function utlosFeilrapport(data: FeilRapportData): void {
  for (const lytter of lyttere) {
    try {
      lytter(data);
    } catch {
      // Ignorer feil i lyttere — unngå uendelig loop
    }
  }
}
