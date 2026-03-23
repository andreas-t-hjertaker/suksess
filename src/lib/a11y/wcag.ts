/**
 * WCAG 2.1 AA-hjelpefunksjoner (Issue #41)
 *
 * - Kontrastsjekk (suksess-kriterium 1.4.3, minimum 4.5:1)
 * - Fokushåndtering
 * - Keyboard-navigasjons-hjelpere
 */

// ---------------------------------------------------------------------------
// Kontrastforhold (WCAG 1.4.3)
// ---------------------------------------------------------------------------

/** Beregn relativ luminans for en RGB-farge */
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Parse hex-farge (#rrggbb eller #rgb) til RGB-komponenter */
function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

/**
 * Beregn kontrastforhold mellom to hex-farger.
 * WCAG 2.1 krav: normal tekst ≥ 4.5:1, stor tekst ≥ 3:1.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = parseHex(hex1);
  const rgb2 = parseHex(hex2);
  if (!rgb1 || !rgb2) return 0;

  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Sjekk om to farger oppfyller WCAG AA-krav */
export function meetsWcagAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  return ratio >= (isLargeText ? 3.0 : 4.5);
}

/** Sjekk om to farger oppfyller WCAG AAA-krav */
export function meetsWcagAAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  return ratio >= (isLargeText ? 4.5 : 7.0);
}

// ---------------------------------------------------------------------------
// Fokushåndtering
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Hent alle fokuserbare elementer inni en container */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
  ).filter((el) => {
    return (
      !el.closest("[aria-hidden='true']") &&
      !el.closest("[hidden]") &&
      window.getComputedStyle(el).display !== "none" &&
      window.getComputedStyle(el).visibility !== "hidden"
    );
  });
}

/** Fokuser første fokuserbare element i container */
export function focusFirst(container: HTMLElement): void {
  const els = getFocusableElements(container);
  els[0]?.focus();
}

/** Fokuser siste fokuserbare element i container */
export function focusLast(container: HTMLElement): void {
  const els = getFocusableElements(container);
  els[els.length - 1]?.focus();
}

// ---------------------------------------------------------------------------
// Keyboard-navigasjons-hjelpere
// ---------------------------------------------------------------------------

/** Sjekk om en KeyboardEvent er en "aktiveringsnøkkel" (Enter eller Space) */
export function isActivationKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return e.key === "Enter" || e.key === " ";
}

/** Sjekk om en KeyboardEvent er en piltast */
export function isArrowKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
}

/**
 * Generer keyboard-handler for roving tabindex-mønster (f.eks. radiogrupper).
 * Se WCAG 2.1, 2.1.1 og ARIA Authoring Practices Guide.
 */
export function makeRovingTabHandler(
  items: HTMLElement[],
  currentIndex: number,
  onChange: (newIndex: number) => void,
  orientation: "horizontal" | "vertical" | "both" = "both"
): (e: React.KeyboardEvent) => void {
  return (e: React.KeyboardEvent) => {
    const prev = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const next = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

    if (
      (orientation === "both" && isArrowKey(e)) ||
      e.key === prev ||
      e.key === next
    ) {
      e.preventDefault();
      let newIndex = currentIndex;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      }
      onChange(newIndex);
      items[newIndex]?.focus();
    }

    if (e.key === "Home") { e.preventDefault(); onChange(0); items[0]?.focus(); }
    if (e.key === "End") { e.preventDefault(); onChange(items.length - 1); items[items.length - 1]?.focus(); }
  };
}

// ---------------------------------------------------------------------------
// ARIA-hjelpere
// ---------------------------------------------------------------------------

/** Generer unikt ID for ARIA-koblinger (label/description) */
let idCounter = 0;
export function generateAriaId(prefix = "aria"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Sjekk om tekst beskriver et bilde tilstrekkelig for WCAG 1.1.1.
 * Minimumskrav: ikke tom, ikke bare whitespace, ikke "bilde av" uten kontekst.
 */
export function isValidAltText(alt: string): boolean {
  if (!alt || !alt.trim()) return false;
  const redundant = /^(bilde|image|foto|photo|illustration|illustrasjon)\s+(av|of)\s*$/i;
  return !redundant.test(alt.trim());
}
