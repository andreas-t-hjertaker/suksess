"use client";

/**
 * FocusTrap — fanger fokus inni en dialog/modal (WCAG 2.1, 2.1.2)
 *
 * Brukes automatisk av OnboardingStepper og alle modaler.
 * Returnerer fokus til trigger-element ved lukking.
 */

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

type FocusTrapProps = {
  active?: boolean;
  children: ReactNode;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

export function FocusTrap({ active = true, children, returnFocusRef }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const previouslyFocused = (returnFocusRef?.current ?? document.activeElement) as HTMLElement | null;

    // Fokuser første fokuserbare element
    const focusFirst = () => {
      const els = getFocusable();
      els[0]?.focus();
    };

    const getFocusable = (): HTMLElement[] => {
      if (!containerRef.current) return [];
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.closest("[aria-hidden='true']"));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Liten timeout for å la DOM sette seg
    const timer = setTimeout(focusFirst, 50);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active, returnFocusRef]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}
