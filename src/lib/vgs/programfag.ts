/**
 * VGS programfag-data og ekstrapoeng-beregning.
 * Basert på Utdanningsdirektoratets programfagtilbud.
 */

export type Programomraade =
  | "Realfag"
  | "Samfunnsfag og økonomi"
  | "Språk, samfunnsfag og økonomi"
  | "Idrettsfag"
  | "Musikk, dans og drama"
  | "Medier og kommunikasjon"
  | "Studiespesialisering";

export type Programfag = {
  id: string;
  fagkode: string;
  name: string;
  programomraade: Programomraade;
  /** Ekstrapoeng ved Samordna opptak */
  extraPoints: number;
  /** Antall vektingstimer per uke */
  weeklyHours: number;
  /** Fag som må være tatt først */
  prerequisites: string[];
  /** True = realfagspoeng */
  isRealfag: boolean;
};

export const PROGRAMFAG: Programfag[] = [
  // --- Realfag ---
  {
    id: "mat-r1",
    fagkode: "REA3028",
    name: "Matematikk R1",
    programomraade: "Realfag",
    extraPoints: 1,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: true,
  },
  {
    id: "mat-r2",
    fagkode: "REA3029",
    name: "Matematikk R2",
    programomraade: "Realfag",
    extraPoints: 1,
    weeklyHours: 5,
    prerequisites: ["mat-r1"],
    isRealfag: true,
  },
  {
    id: "fys-1",
    fagkode: "REA3004",
    name: "Fysikk 1",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: true,
  },
  {
    id: "fys-2",
    fagkode: "REA3005",
    name: "Fysikk 2",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: ["fys-1", "mat-r1"],
    isRealfag: true,
  },
  {
    id: "kje-1",
    fagkode: "REA3011",
    name: "Kjemi 1",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: true,
  },
  {
    id: "kje-2",
    fagkode: "REA3012",
    name: "Kjemi 2",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: ["kje-1"],
    isRealfag: true,
  },
  {
    id: "bio-1",
    fagkode: "REA3003",
    name: "Biologi 1",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: true,
  },
  {
    id: "bio-2",
    fagkode: "REA3002",
    name: "Biologi 2",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: ["bio-1"],
    isRealfag: true,
  },
  {
    id: "geo-1",
    fagkode: "REA3006",
    name: "Geofag 1",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: true,
  },
  {
    id: "inf-1",
    fagkode: "REA3012INF",
    name: "Informasjonsteknologi 1",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: false,
  },
  {
    id: "inf-2",
    fagkode: "REA3013INF",
    name: "Informasjonsteknologi 2",
    programomraade: "Realfag",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: ["inf-1"],
    isRealfag: false,
  },

  // --- Fremmedspråk (gir ekstrapoeng) ---
  {
    id: "spansk-2",
    fagkode: "FSP5941",
    name: "Spansk 2",
    programomraade: "Språk, samfunnsfag og økonomi",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: ["spansk-1"],
    isRealfag: false,
  },
  {
    id: "tysk-2",
    fagkode: "FSP5940",
    name: "Tysk 2",
    programomraade: "Språk, samfunnsfag og økonomi",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: ["tysk-1"],
    isRealfag: false,
  },
  {
    id: "fransk-2",
    fagkode: "FSP5942",
    name: "Fransk 2",
    programomraade: "Språk, samfunnsfag og økonomi",
    extraPoints: 0.5,
    weeklyHours: 5,
    prerequisites: ["fransk-1"],
    isRealfag: false,
  },

  // --- Samfunnsfag ---
  {
    id: "oko",
    fagkode: "SAF1003",
    name: "Økonomi og ledelse",
    programomraade: "Samfunnsfag og økonomi",
    extraPoints: 0,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: false,
  },
  {
    id: "psykologi",
    fagkode: "PSY1002",
    name: "Psykologi 2",
    programomraade: "Samfunnsfag og økonomi",
    extraPoints: 0,
    weeklyHours: 5,
    prerequisites: [],
    isRealfag: false,
  },
];

// ---------------------------------------------------------------------------
// Beregning
// ---------------------------------------------------------------------------

/** Beregn totale ekstrapoeng for valgte programfag */
export function calculateExtraPoints(selectedIds: string[]): number {
  const selected = PROGRAMFAG.filter((f) => selectedIds.includes(f.id));
  const realfagPoeng = selected
    .filter((f) => f.isRealfag)
    .reduce((sum, f) => sum + f.extraPoints, 0);
  const spraakPoeng = selected
    .filter((f) => !f.isRealfag && f.extraPoints > 0)
    .reduce((sum, f) => sum + f.extraPoints, 0);

  // Maks 4 realfagspoeng, maks 0.5 per fremmedspråk
  return Math.min(realfagPoeng, 4) + Math.min(spraakPoeng, 0.5);
}

/** Sjekk om et programfag er tilgjengelig (forutsetninger oppfylt) */
export function isAvailable(fagId: string, selectedIds: string[]): boolean {
  const fag = PROGRAMFAG.find((f) => f.id === fagId);
  if (!fag) return false;
  return fag.prerequisites.every((prereq) => selectedIds.includes(prereq));
}
