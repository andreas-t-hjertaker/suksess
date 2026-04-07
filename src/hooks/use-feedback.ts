"use client";

/**
 * useFeedback — hook for å sende tilbakemeldinger til Firestore.
 *
 * Samler automatisk teknisk kontekst (nettleser, OS, skjermstørrelse, brødsmler)
 * og lagrer til `feedback`-collection i Firestore.
 *
 * Notion-sync skjer automatisk via Cloud Function-trigger.
 */

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { logger } from "@/lib/observability/logger";
import {
  hentBrodsmler,
  tomBrodsmler,
  detekterNettleser,
  detekterOS,
  hentSkjermstorrelse,
} from "@/lib/brodsmule-samler";
import type {
  TilbakemeldingType,
  TilbakemeldingKilde,
  TilbakemeldingPrioritet,
  Brodsmuler,
} from "@/types/domain";

type SendTilbakemeldingInput = {
  type: TilbakemeldingType;
  tittel: string;
  beskrivelse: string;
  prioritet?: TilbakemeldingPrioritet;
  kilde: TilbakemeldingKilde;
  feilmelding?: string;
  stackTrace?: string;
  komponentStack?: string;
};

type ToastMelding = {
  type: TilbakemeldingType;
  melding: string;
};

const TOAST_MELDINGER: Record<TilbakemeldingType, string> = {
  feil: "Feilrapporten er sendt — takk for hjelpen!",
  forslag: "Forslaget er sendt — vi setter pris på innspillet!",
  ros: "Tusen takk for de hyggelige ordene!",
};

export function useFeedback() {
  const { user } = useAuth();
  const [sender, setSender] = useState(false);
  const [sisteSendt, setSisteSendt] = useState<ToastMelding | null>(null);

  async function sendTilbakemelding(
    input: SendTilbakemeldingInput
  ): Promise<boolean> {
    if (!user) {
      logger.warn("feedback_uautentisert", { kilde: input.kilde });
      return false;
    }

    setSender(true);

    try {
      const brodsmler: Brodsmuler[] = hentBrodsmler();

      await addDoc(collection(db, "feedback"), {
        type: input.type,
        tittel: input.tittel,
        beskrivelse: input.beskrivelse.slice(0, 2000),
        prioritet: input.prioritet ?? null,
        kilde: input.kilde,
        side:
          typeof window !== "undefined" ? window.location.pathname : "ukjent",
        nettleser: `${detekterNettleser()} / ${detekterOS()}`,
        skjermstorrelse: hentSkjermstorrelse(),
        uid: user.uid,
        epost: user.email ?? null,
        feilmelding: input.feilmelding ?? null,
        stackTrace: input.stackTrace?.slice(0, 2000) ?? null,
        komponentStack: input.komponentStack?.slice(0, 1000) ?? null,
        brodsmler: brodsmler.length > 0 ? brodsmler : null,
        status: "ny",
        createdAt: serverTimestamp(),
      });

      // Tøm brødsmler etter vellykket innsending
      tomBrodsmler();

      logger.info("feedback_sendt", {
        type: input.type,
        kilde: input.kilde,
        harFeilkontekst: !!input.feilmelding,
      });

      setSisteSendt({
        type: input.type,
        melding: TOAST_MELDINGER[input.type],
      });

      return true;
    } catch (err) {
      logger.error("feedback_feilet", {
        error: err instanceof Error ? err.message : "ukjent",
      });
      return false;
    } finally {
      setSender(false);
    }
  }

  return { sendTilbakemelding, sender, sisteSendt };
}
