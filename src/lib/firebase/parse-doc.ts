/**
 * Typed Firestore document parser — erstatter usikre `as`-casts.
 *
 * Bruker Zod v4 for runtime-validering av data fra Firestore snapshots.
 * Ved valideringsfeil logges en advarsel og null returneres (fail-safe).
 */

import type { DocumentSnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import type { z } from "zod";

/**
 * Parser et Firestore DocumentSnapshot med et Zod-skjema.
 * @returns Validert data, eller null hvis dokumentet ikke finnes / er ugyldig.
 */
export function parseDoc<T extends z.ZodType>(
  snap: DocumentSnapshot,
  schema: T,
): z.infer<T> | null {
  if (!snap.exists()) return null;

  const result = schema.safeParse(snap.data());
  if (result.success) return result.data;

  console.warn(
    `[parseDoc] Valideringsfeil for ${snap.ref.path}:`,
    result.error,
  );
  return null;
}

/**
 * Parser en liste av QueryDocumentSnapshots. Ugyldige dokumenter filtreres
 * bort med advarsel, slik at ett korrupt dokument ikke krasjer hele listen.
 */
export function parseDocs<T extends z.ZodType>(
  docs: QueryDocumentSnapshot[],
  schema: T,
): z.infer<T>[] {
  return docs.reduce<z.infer<T>[]>((acc, d) => {
    const result = schema.safeParse(d.data());
    if (result.success) {
      acc.push(result.data);
    } else {
      console.warn(
        `[parseDocs] Valideringsfeil for ${d.ref.path}:`,
        result.error,
      );
    }
    return acc;
  }, []);
}

/**
 * Parser en liste av QueryDocumentSnapshots og legger til `id` på hvert dokument.
 */
export function parseDocsWithId<T extends z.ZodType>(
  docs: QueryDocumentSnapshot[],
  schema: T,
): (z.infer<T> & { id: string })[] {
  return docs.reduce<(z.infer<T> & { id: string })[]>((acc, d) => {
    const result = schema.safeParse(d.data());
    if (result.success) {
      acc.push(Object.assign({}, result.data as Record<string, unknown>, { id: d.id }) as z.infer<T> & { id: string });
    } else {
      console.warn(
        `[parseDocsWithId] Valideringsfeil for ${d.ref.path}:`,
        result.error,
      );
    }
    return acc;
  }, []);
}
