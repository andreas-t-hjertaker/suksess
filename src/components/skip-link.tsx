"use client";

/**
 * SkipLink — hopp-til-innhold for tastaturbrukere (WCAG 2.1, suksess-kriterium 2.4.1)
 *
 * Bare synlig ved focus. Lenker til #main-content.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={[
        "sr-only focus:not-sr-only",
        "fixed left-4 top-4 z-[100]",
        "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-transform focus:translate-y-0 -translate-y-full focus:translate-y-0",
      ].join(" ")}
    >
      Hopp til innhold
    </a>
  );
}
