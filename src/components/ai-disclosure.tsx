"use client";

/**
 * AI Disclosure-komponent — EU AI Act Art. 52 (Issue #103)
 *
 * Informerer brukeren om at de interagerer med et AI-system.
 * Vises i alle AI-drevne grensesnitt (chat, karrierestier, jobbmatch).
 */

import { useState } from "react";
import { Info, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { AI_DISCLOSURE_NOTICE, getTransparencyInfo } from "@/lib/ai/eu-ai-act";

type AiDisclosureProps = {
  featureId: string;
  locale?: "nb" | "nn" | "se";
  /** Kompakt modus — viser kun varselstekst uten utvidbar seksjon */
  compact?: boolean;
};

export function AiDisclosure({ featureId, locale = "nb", compact = false }: AiDisclosureProps) {
  const [expanded, setExpanded] = useState(false);
  const transparency = getTransparencyInfo(featureId);
  const notice = AI_DISCLOSURE_NOTICE[locale];

  return (
    <div
      role="status"
      aria-label="AI-transparensvarsel"
      className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
    >
      <div className="flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p>{notice}</p>

          {!compact && transparency && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              aria-expanded={expanded}
            >
              <Info className="h-3 w-3" />
              {expanded ? "Skjul detaljer" : "Mer om hvordan AI brukes"}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}

          {expanded && transparency && (
            <div className="mt-3 space-y-3 border-t border-blue-200 pt-3 dark:border-blue-800">
              <div>
                <h4 className="font-medium">Formål</h4>
                <p className="mt-0.5 text-xs">{transparency.purpose}</p>
              </div>

              <div>
                <h4 className="font-medium">Data som brukes</h4>
                <ul className="mt-0.5 list-inside list-disc text-xs">
                  {transparency.dataUsed.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Begrensninger</h4>
                <ul className="mt-0.5 list-inside list-disc text-xs">
                  {transparency.limitations.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Dine rettigheter</h4>
                <ul className="mt-0.5 list-inside list-disc text-xs">
                  {transparency.userControl.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-blue-600 dark:text-blue-400">
                Klager og henvendelser: {transparency.complaintContact}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
