import type { User } from "@/types";
import type { AssistantContext } from "../types";

/** Bygg standard kontekst fra brukerdata og nåværende sti */
export function getDefaultContext(
  user: User | null,
  pathname: string,
  locale?: "nb" | "nn" | "se"
): AssistantContext {
  return {
    user: user
      ? {
          displayName: user.displayName,
          email: user.email,
          uid: user.uid,
        }
      : undefined,
    appName: "Suksess",
    currentPath: pathname,
    locale: locale ?? "nb",
  };
}
