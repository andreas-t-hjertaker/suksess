/**
 * CV-data typer, skjema og standardverdier for CV-builder.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// CV-data Zod-skjema
// ---------------------------------------------------------------------------

export const CvDataSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  website: z.string(),
  summary: z.string(),
  includeGrades: z.boolean(),
  includeStrengths: z.boolean(),
  includeRiasec: z.boolean(),
  includeInterests: z.boolean(),
  extraExperience: z.string(),
  extraEducation: z.string(),
  languages: z.string(),
});

// ---------------------------------------------------------------------------
// CV-data type
// ---------------------------------------------------------------------------

export type CvData = {
  name: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  // Fylles automatisk fra profil/karakterer
  includeGrades: boolean;
  includeStrengths: boolean;
  includeRiasec: boolean;
  includeInterests: boolean;
  extraExperience: string; // fritekst
  extraEducation: string;  // fritekst
  languages: string;       // fritekst
};

// ---------------------------------------------------------------------------
// Standardverdier
// ---------------------------------------------------------------------------

export const DEFAULT_CV: CvData = {
  name: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  summary: "",
  includeGrades: true,
  includeStrengths: true,
  includeRiasec: false,
  includeInterests: true,
  extraExperience: "",
  extraEducation: "",
  languages: "Norsk (morsmål), Engelsk (flytende)",
};

// ---------------------------------------------------------------------------
// Styrke-etiketter (norsk bokmål)
// ---------------------------------------------------------------------------

export const STRENGTH_LABELS: Record<string, string> = {
  kreativitet: "Kreativitet",
  nysgjerrighet: "Nysgjerrighet",
  lederskap: "Lederskap",
  empati: "Empati",
  utholdenhet: "Utholdenhet",
  humor: "Humor",
  rettferdighet: "Rettferdighet",
};
