/**
 * NVB (Nasjonal vitnemålsdatabase) karakterimport (Issue #147)
 *
 * Importerer vitnemålsdata fra NVB via Feide-autentisering.
 * NVB leverer offisielle karakterer fra VGS som kan brukes
 * til å beregne opptakspoeng og matche studieprogrammer.
 *
 * NVB API: https://nvb.hkdir.no (HK-dir / Unit)
 * Autentisering: Feide OIDC (brukerens eget token)
 *
 * Flyt:
 * 1. Bruker logger inn med Feide
 * 2. Frontend sender Feide access_token til denne Cloud Function
 * 3. Cloud Function henter karakterer fra NVB API
 * 4. Karakterer lagres i Firestore (users/{uid}/grades/)
 * 5. Merkes med source: "nvb" for sporing
 */

import * as admin from "firebase-admin";
import { success, fail, withAuth } from "../middleware";
import { db } from "../constants";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

/** NVB vitnemål (transcript) */
type NvbVitnemal = {
  vitnemalId: string;
  type: "vitnemal" | "kompetansebevis";
  skole: {
    navn: string;
    organisasjonsnummer?: string;
  };
  utstedtDato: string;
  programomraade: string;
  karakterer: NvbKarakter[];
};

/** NVB karakter (grade entry) */
type NvbKarakter = {
  fagkode: string;
  fagnavn: string;
  /** Standpunktkarakter */
  standpunkt?: number;
  /** Eksamenskarakter */
  eksamen?: number;
  /** Halvårskarakter */
  halvaar?: number;
  termin: "V" | "H";
  aar: number;
  /** Fagtype: fellesfag, programfag, valgfag */
  fagtype?: string;
};

/** NVB API-respons */
type NvbResponse = {
  vitnemal: NvbVitnemal[];
  person: {
    fodselsaar?: number;
    kjonn?: string;
  };
};

/** Resultat fra import */
type ImportResult = {
  imported: number;
  skipped: number;
  vitnemal: number;
  errors: string[];
};

// ---------------------------------------------------------------------------
// NVB API-klient
// ---------------------------------------------------------------------------

const NVB_API_BASE = process.env.NVB_API_URL || "https://nvb-api.hkdir.no/api/v1";

/**
 * Hent vitnemål fra NVB API med brukerens Feide-token.
 */
async function fetchNvbVitnemal(feideAccessToken: string): Promise<NvbResponse> {
  const response = await fetch(`${NVB_API_BASE}/vitnemal/mine`, {
    headers: {
      Authorization: `Bearer ${feideAccessToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Feide-token er ugyldig eller utløpt");
    }
    if (response.status === 404) {
      // Ingen vitnemål funnet — ikke en feil
      return { vitnemal: [], person: {} };
    }
    throw new Error(`NVB API feil: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<NvbResponse>;
}

// ---------------------------------------------------------------------------
// Konvertering NVB → Suksess Grade
// ---------------------------------------------------------------------------

/**
 * Konverter NVB termin-format til Suksess TermType.
 */
function mapTermin(termin: "V" | "H"): "vt" | "ht" {
  return termin === "V" ? "vt" : "ht";
}

/**
 * Konverter NVB karakter til Suksess Grade-format.
 * Bruker standpunktkarakter som primær, fallback til eksamen.
 */
function convertNvbToGrade(
  karakter: NvbKarakter,
  userId: string,
): {
  userId: string;
  subject: string;
  fagkode: string;
  grade: number;
  term: "vt" | "ht";
  year: number;
  programSubjectId: string | null;
  source: "nvb";
  nvbImportedAt: FirebaseFirestore.FieldValue;
} | null {
  // Prioriter: standpunkt → eksamen → halvår
  const gradeValue = karakter.standpunkt ?? karakter.eksamen ?? karakter.halvaar;

  if (!gradeValue || gradeValue < 1 || gradeValue > 6) {
    return null; // Ugyldig karakter
  }

  return {
    userId,
    subject: karakter.fagnavn,
    fagkode: karakter.fagkode,
    grade: gradeValue,
    term: mapTermin(karakter.termin),
    year: karakter.aar,
    programSubjectId: null,
    source: "nvb",
    nvbImportedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ---------------------------------------------------------------------------
// Import-logikk
// ---------------------------------------------------------------------------

/**
 * Importer karakterer fra NVB til Firestore.
 * Unngår duplikater basert på fagkode + termin + år.
 */
async function importNvbGrades(
  userId: string,
  feideAccessToken: string,
): Promise<ImportResult> {
  const nvbData = await fetchNvbVitnemal(feideAccessToken);
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    vitnemal: nvbData.vitnemal.length,
    errors: [],
  };

  if (nvbData.vitnemal.length === 0) {
    return result;
  }

  // Hent eksisterende karakterer for å unngå duplikater
  const existingSnap = await db
    .collection("users")
    .doc(userId)
    .collection("grades")
    .get();

  const existingKeys = new Set<string>();
  for (const doc of existingSnap.docs) {
    const data = doc.data();
    const key = `${data.fagkode}_${data.term}_${data.year}`;
    existingKeys.add(key);
  }

  // Konverter og lagre karakterer
  const batch = db.batch();
  let batchCount = 0;

  for (const vitnemal of nvbData.vitnemal) {
    for (const karakter of vitnemal.karakterer) {
      const grade = convertNvbToGrade(karakter, userId);

      if (!grade) {
        result.errors.push(`Ugyldig karakter for ${karakter.fagkode}: ${karakter.standpunkt ?? "mangler"}`);
        continue;
      }

      // Sjekk for duplikat
      const key = `${grade.fagkode}_${grade.term}_${grade.year}`;
      if (existingKeys.has(key)) {
        result.skipped++;
        continue;
      }

      const ref = db
        .collection("users")
        .doc(userId)
        .collection("grades")
        .doc();

      batch.set(ref, {
        ...grade,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      existingKeys.add(key);
      result.imported++;
      batchCount++;

      // Firestore batch limit: 500 operasjoner
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.info(
    `[nvb] Importert ${result.imported} karakterer for bruker ${userId} ` +
    `(${result.skipped} duplikater hoppet over, ${result.errors.length} feil)`
  );

  return result;
}

// ---------------------------------------------------------------------------
// API-handlers
// ---------------------------------------------------------------------------

/**
 * POST /nvb/import — Importer karakterer fra NVB.
 *
 * Body: { feideAccessToken: string }
 * Krever: Autentisert bruker (Firebase ID-token)
 */
export const importNvbGradesHandler = withAuth(async ({ req, res, user }) => {
  const { feideAccessToken } = req.body as { feideAccessToken?: string };

  if (!feideAccessToken) {
    fail(res, "Mangler feideAccessToken", 400);
    return;
  }

  try {
    const result = await importNvbGrades(user.uid, feideAccessToken);
    success(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil ved NVB-import";
    console.error("[nvb] Import feilet:", err);
    fail(res, message, 500);
  }
});

/**
 * GET /nvb/status — Sjekk om bruker har importerte NVB-karakterer.
 */
export const getNvbStatusHandler = withAuth(async ({ res, user }) => {
  const snap = await db
    .collection("users")
    .doc(user.uid)
    .collection("grades")
    .where("source", "==", "nvb")
    .limit(1)
    .get();

  success(res, {
    hasNvbGrades: !snap.empty,
    lastImported: snap.empty ? null : snap.docs[0].data().nvbImportedAt,
  });
});
