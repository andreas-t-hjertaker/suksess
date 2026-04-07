/**
 * Seed-script for testbruker med komplett testdata.
 *
 * Oppretter en dedikert testbruker "Emma Testersen" med:
 * - Fullført personlighetsprofil (Big Five + RIASEC)
 * - Testresultater med realistiske rå-svar
 * - 12 VGS-karakterer (Vg1 + Vg2)
 * - Gamification: 420 XP (Veiviser-nivå), 7 achievements, 5-dagers streak
 * - 2 AI-samtaler med historikk
 * - Tenant-tilknytning (Fiktiv VGS)
 *
 * Kjøres fra utvikler-siden. Bruker den innloggede brukerens UID.
 */

import {
  doc,
  writeBatch,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firestore";
import { COLLECTIONS } from "./collections";

// ---------------------------------------------------------------------------
// Testbruker-profil: "Emma Testersen" — kreativ, analytisk VGS-elev
// ---------------------------------------------------------------------------

const TEST_USER_DISPLAY_NAME = "Emma Testersen";
const TEST_TENANT_ID = "test-skole-vgs";

/** Big Five scorer: Høy åpenhet og planmessighet, middels utadvendthet */
const BIG_FIVE_SCORES = {
  openness: 82,
  conscientiousness: 71,
  extraversion: 55,
  agreeableness: 68,
  neuroticism: 35,
};

/** RIASEC: Investigative-Artistic-Social (IAS) profil */
const RIASEC_SCORES = {
  realistic: 38,
  investigative: 85,
  artistic: 72,
  social: 65,
  enterprising: 45,
  conventional: 42,
};

// ---------------------------------------------------------------------------
// Realistiske rå-svar for personlighetstester
// ---------------------------------------------------------------------------

/** Big Five rå-svar (40 spørsmål, Likert 1-5) */
const BIG_FIVE_RAW_ANSWERS: Record<string, number> = {
  // Openness — høy (snitt ~4.1)
  o1: 5, o2: 4, o3: 5, o4: 4, o5: 4, o6: 2, o7: 5, o8: 1,
  // Conscientiousness — høy (snitt ~3.9)
  c1: 4, c2: 4, c3: 3, c4: 5, c5: 2, c6: 2, c7: 4, c8: 4,
  // Extraversion — middels (snitt ~3.1)
  e1: 3, e2: 4, e3: 2, e4: 4, e5: 3, e6: 3, e7: 3, e8: 3,
  // Agreeableness — over middels (snitt ~3.6)
  a1: 4, a2: 4, a3: 5, a4: 3, a5: 2, a6: 3, a7: 4, a8: 4,
  // Neuroticism — lav (snitt ~2.1)
  n1: 2, n2: 3, n3: 2, n4: 2, n5: 4, n6: 4, n7: 2, n8: 4,
};

/** RIASEC rå-svar (30 spørsmål, Likert 1-5) */
const RIASEC_RAW_ANSWERS: Record<string, number> = {
  // Realistic — lav-middels
  r1: 2, r2: 2, r3: 3, r4: 3, r5: 2,
  // Investigative — høy
  i1: 5, i2: 5, i3: 4, i4: 5, i5: 4,
  // Artistic — høy
  ar1: 4, ar2: 5, ar3: 4, ar4: 4, ar5: 3,
  // Social — over middels
  s1: 4, s2: 3, s3: 4, s4: 4, s5: 3,
  // Enterprising — middels
  en1: 3, en2: 3, en3: 2, en4: 3, en5: 3,
  // Conventional — lav-middels
  co1: 2, co2: 3, co3: 2, co4: 2, co5: 3,
};

/** Styrke-svar */
const STRENGTH_RAW_ANSWERS: Record<string, number> = {
  st1: 5, st2: 5, st3: 5, st4: 4, st5: 3, st6: 3,
  st7: 4, st8: 4, st9: 4, st10: 4, st11: 4, st12: 5,
  st13: 5, st14: 4,
};

// ---------------------------------------------------------------------------
// VGS-karakterer: Studiespesialiserende Vg1 + Vg2 Realfag
// ---------------------------------------------------------------------------

type SeedGrade = {
  subject: string;
  fagkode: string;
  grade: 1 | 2 | 3 | 4 | 5 | 6;
  term: "vt" | "ht";
  year: number;
};

const GRADES: SeedGrade[] = [
  // Vg1 Høst 2024
  { subject: "Norsk hovedmål", fagkode: "NOR1267", grade: 5, term: "ht", year: 2024 },
  { subject: "Engelsk", fagkode: "ENG1007", grade: 5, term: "ht", year: 2024 },
  { subject: "Matematikk 1T", fagkode: "MAT1013", grade: 4, term: "ht", year: 2024 },
  { subject: "Naturfag", fagkode: "NAT1007", grade: 5, term: "ht", year: 2024 },
  { subject: "Samfunnsfag", fagkode: "SAF1005", grade: 4, term: "ht", year: 2024 },
  { subject: "Geografi", fagkode: "GEO1003", grade: 4, term: "ht", year: 2024 },

  // Vg1 Vår 2025
  { subject: "Norsk hovedmål", fagkode: "NOR1267", grade: 5, term: "vt", year: 2025 },
  { subject: "Engelsk", fagkode: "ENG1007", grade: 5, term: "vt", year: 2025 },
  { subject: "Matematikk 1T", fagkode: "MAT1013", grade: 5, term: "vt", year: 2025 },
  { subject: "Naturfag", fagkode: "NAT1007", grade: 5, term: "vt", year: 2025 },

  // Vg2 Høst 2025 (realfag)
  { subject: "Matematikk R1", fagkode: "MAT1017", grade: 4, term: "ht", year: 2025 },
  { subject: "Fysikk 1", fagkode: "FYS1002", grade: 5, term: "ht", year: 2025 },
  { subject: "Kjemi 1", fagkode: "KJE1002", grade: 4, term: "ht", year: 2025 },
  { subject: "Informasjonsteknologi 1", fagkode: "INF1007", grade: 6, term: "ht", year: 2025 },
  { subject: "Norsk hovedmål", fagkode: "NOR1267", grade: 5, term: "ht", year: 2025 },
  { subject: "Historie", fagkode: "HIS1010", grade: 5, term: "ht", year: 2025 },

  // Vg2 Vår 2026 (pågående)
  { subject: "Matematikk R1", fagkode: "MAT1017", grade: 5, term: "vt", year: 2026 },
  { subject: "Fysikk 1", fagkode: "FYS1002", grade: 5, term: "vt", year: 2026 },
];

// ---------------------------------------------------------------------------
// AI-samtaler
// ---------------------------------------------------------------------------

function chatTimestamp(daysAgo: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return Timestamp.fromDate(d);
}

const CONVERSATIONS = [
  {
    id: "conv-karriere-1",
    title: "Karriereveiledning: teknologi vs. design",
    messages: [
      {
        role: "user" as const,
        content: "Hei! Jeg lurer på om jeg bør satse på programmering eller UX-design. Jeg liker begge deler.",
        timestamp: chatTimestamp(5),
      },
      {
        role: "assistant" as const,
        content: "Hei Emma! Ut fra profilen din ser jeg at du scorer høyt på både Investigative og Artistic i RIASEC-profilen, noe som passer godt for begge retninger. Med din sterke åpenhet (82) og planmessighet (71) i Big Five kan du trives i roller som kombinerer kreativitet med analytisk tenkning.\n\nNoen karriereveier som kombinerer begge:\n- **UX-forsker** — bruker analytiske metoder for å forbedre brukeropplevelser\n- **Creative Technologist** — bygger interaktive opplevelser\n- **Fullstack-utvikler med designfokus** — koder og designer\n\nHva tiltrekker deg mest — å løse tekniske problemer eller å forme visuelle opplevelser?",
        timestamp: chatTimestamp(5),
      },
      {
        role: "user" as const,
        content: "Jeg tror jeg liker å løse problemer best, men vil at løsningen skal se bra ut. Kanskje frontend-utvikling?",
        timestamp: chatTimestamp(5),
      },
      {
        role: "assistant" as const,
        content: "Frontend-utvikling er en utmerket match for deg! Det kombinerer:\n- **Problemløsning** (din I-kode) — logikk, ytelse, tilgjengelighet\n- **Estetikk** (din A-kode) — visuell design, animasjoner, UX\n- **Samarbeid** (din S-kode) — jobbe tett med designere og brukere\n\n**Anbefalt utdanningsvei:**\n1. Informatikk bachelor (UiO, NTNU, UiB) — gir bred teknisk base\n2. Valgfrie emner i interaksjonsdesign\n3. Personlige prosjekter / portfolio underveis\n\nMed dine karakterer i IT (6!) og Matte R1 (4-5) har du et godt utgangspunkt. Vil du se på konkrete studieprogrammer?",
        timestamp: chatTimestamp(5),
      },
    ],
  },
  {
    id: "conv-studier-1",
    title: "Studieprogrammer i informatikk",
    messages: [
      {
        role: "user" as const,
        content: "Kan du fortelle meg om forskjellen mellom informatikk på UiO og NTNU?",
        timestamp: chatTimestamp(2),
      },
      {
        role: "assistant" as const,
        content: "Selvfølgelig! Her er en sammenligning:\n\n**Informatikk — UiO:**\n- Mer teoretisk/vitenskapelig fokus\n- Sterk i AI, maskinlæring og språkteknologi\n- Ligger i Oslo, stort IT-miljø og mange praksisplasser\n- Opptakskrav: ca 4.5 i snitt\n\n**Datateknikk — NTNU:**\n- Mer ingeniørrettet, sivilingeniør 5 år\n- Sterk i systemutvikling, embedded og cybersikkerhet\n- Trondheim — tett studentmiljø, linjeforening (Online/Abakus)\n- Opptakskrav: ca 5.0-5.5 i snitt\n\nMed ditt snitt (~4.8) og dine interesser i kreativ problemløsning passer UiO godt, men NTNU er også realistisk med litt forbedring i Vg3. Hva tenker du om by og studiemiljø?",
        timestamp: chatTimestamp(2),
      },
      {
        role: "user" as const,
        content: "Takk! Jeg tror UiO høres best ut for meg. Kan du legge det til i favorittene mine?",
        timestamp: chatTimestamp(2),
      },
      {
        role: "assistant" as const,
        content: "Bra valg! Informatikk ved UiO passer godt med din IAS-profil og dine styrker i kreativitet og nysgjerrighet.\n\nDu kan legge det til i favorittene dine på **Studier**-siden i dashbordet. Der kan du også sammenligne opptakskrav med dine nåværende karakterer.\n\nNoen tips for å styrke søknaden:\n- Fortsett med gode karakterer i Matte R1 og IT\n- Vurder Matte R2 i Vg3 for ekstra realfagspoeng\n- Bygg en liten portfolio med kodeprosjekter\n\nLykke til! 🎓",
        timestamp: chatTimestamp(2),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Achievements og XP
// ---------------------------------------------------------------------------

const EARNED_ACHIEVEMENTS = [
  "first_login",
  "profile_complete",
  "test_taker",
  "grade_tracker",
  "explorer",
  "streak_starter",
  "level_utforsker",
] as const;

const TOTAL_XP = 420; // Veiviser-nivå (300-599)

// ---------------------------------------------------------------------------
// Seed-funksjon
// ---------------------------------------------------------------------------

export type SeedResult = {
  success: boolean;
  message: string;
  details: string[];
};

/**
 * Seed komplett testdata for den innloggede brukeren.
 * Overskriver eksisterende data for brukeren.
 */
export async function seedTestUser(userId: string): Promise<SeedResult> {
  const details: string[] = [];

  try {
    // --- Batch 1: UserDoc + Profile + Tenant ---
    const batch1 = writeBatch(db);

    // UserDoc
    batch1.set(doc(db, COLLECTIONS.USERS, userId), {
      uid: userId,
      displayName: TEST_USER_DISPLAY_NAME,
      email: "emma.testersen@testvgs.no",
      photoURL: null,
      role: "student",
      tenantId: TEST_TENANT_ID,
      onboardingComplete: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    details.push("UserDoc: Emma Testersen (student, onboarding fullført)");

    // UserProfile
    batch1.set(doc(db, COLLECTIONS.PROFILES, userId), {
      userId,
      bigFive: BIG_FIVE_SCORES,
      riasec: RIASEC_SCORES,
      strengths: ["kreativitet", "nysgjerrighet", "utholdenhet"],
      interests: ["teknologi", "design", "naturfag", "musikk"],
      learningStyle: "visual",
      clusterId: "creative",
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    details.push("Profil: Big Five (O:82 C:71 E:55 A:68 N:35), RIASEC (I:85 A:72 S:65)");

    // Tenant
    batch1.set(doc(db, COLLECTIONS.TENANTS, TEST_TENANT_ID), {
      name: "Nordvik videregående skole",
      type: "vgs",
      feideOrgId: "test.feide.no",
      logoUrl: null,
      primaryColor: "#2563eb",
      adminUids: [],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    details.push("Tenant: Nordvik videregående skole");

    await batch1.commit();

    // --- Batch 2: Test Results ---
    const batch2 = writeBatch(db);

    // Big Five test result
    const bf = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.SUB.TEST_RESULTS));
    batch2.set(bf, {
      userId,
      testType: "big_five",
      rawAnswers: BIG_FIVE_RAW_ANSWERS,
      scores: BIG_FIVE_SCORES,
      completedAt: chatTimestamp(30),
      createdAt: chatTimestamp(30),
      updatedAt: chatTimestamp(30),
    });

    // RIASEC test result
    const ri = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.SUB.TEST_RESULTS));
    batch2.set(ri, {
      userId,
      testType: "riasec",
      rawAnswers: RIASEC_RAW_ANSWERS,
      scores: RIASEC_SCORES,
      completedAt: chatTimestamp(30),
      createdAt: chatTimestamp(30),
      updatedAt: chatTimestamp(30),
    });

    // Strengths test result
    const st = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.SUB.TEST_RESULTS));
    batch2.set(st, {
      userId,
      testType: "strengths",
      rawAnswers: STRENGTH_RAW_ANSWERS,
      scores: {
        kreativitet: 90, nysgjerrighet: 82, lederskap: 48,
        empati: 72, utholdenhet: 72, humor: 82, rettferdighet: 82,
      },
      completedAt: chatTimestamp(30),
      createdAt: chatTimestamp(30),
      updatedAt: chatTimestamp(30),
    });

    details.push("Testresultater: Big Five, RIASEC og Styrker");
    await batch2.commit();

    // --- Batch 3: Grades ---
    const batch3 = writeBatch(db);

    for (const g of GRADES) {
      const ref = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.SUB.GRADES));
      batch3.set(ref, {
        userId,
        subject: g.subject,
        fagkode: g.fagkode,
        grade: g.grade,
        term: g.term,
        year: g.year,
        programSubjectId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    details.push(`Karakterer: ${GRADES.length} fag (Vg1+Vg2, snitt ~4.8)`);
    await batch3.commit();

    // --- Batch 4: Gamification ---
    const batch4 = writeBatch(db);

    // XP document
    const xpRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.SUB.GAMIFICATION, "xp");
    const streakStart = new Date();
    streakStart.setDate(streakStart.getDate() - 4);
    batch4.set(xpRef, {
      totalXp: TOTAL_XP,
      earnedAchievements: [...EARNED_ACHIEVEMENTS],
      streak: 5,
      lastLoginDate: new Date().toISOString().split("T")[0],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    details.push(`Gamification: ${TOTAL_XP} XP (Veiviser), ${EARNED_ACHIEVEMENTS.length} achievements, 5-dagers streak`);
    await batch4.commit();

    // --- Batch 5: Conversations ---
    const batch5 = writeBatch(db);

    for (const conv of CONVERSATIONS) {
      const ref = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.SUB.CONVERSATIONS, conv.id);
      batch5.set(ref, {
        userId,
        title: conv.title,
        messages: conv.messages,
        lastMessageAt: conv.messages[conv.messages.length - 1].timestamp,
        createdAt: conv.messages[0].timestamp,
        updatedAt: conv.messages[conv.messages.length - 1].timestamp,
      });
    }

    details.push(`Samtaler: ${CONVERSATIONS.length} AI-veileder-samtaler`);
    await batch5.commit();

    // --- Batch 6: Feature flags ---
    const batch6 = writeBatch(db);
    const flags = [
      { id: "ai_chat", feature: "ai_chat", enabled: true, rolloutPercentage: 100 },
      { id: "career_graph", feature: "career_graph", enabled: true, rolloutPercentage: 100 },
      { id: "adaptive_ui", feature: "adaptive_ui", enabled: true, rolloutPercentage: 100 },
      { id: "gamification", feature: "gamification", enabled: true, rolloutPercentage: 100 },
      { id: "stripe_billing", feature: "stripe_billing", enabled: true, rolloutPercentage: 100 },
      { id: "i18n_nynorsk", feature: "i18n_nynorsk", enabled: true, rolloutPercentage: 100 },
    ];
    for (const flag of flags) {
      batch6.set(doc(db, COLLECTIONS.FEATURE_FLAGS, flag.id), {
        ...flag,
        key: flag.id,
        label: flag.feature,
        description: null,
        plans: [],
        tenantIds: [],
        excludedTenantIds: [],
        updatedAt: serverTimestamp(),
      });
    }
    details.push("Feature flags: Alle aktivert (inkl. Stripe og nynorsk)");
    await batch6.commit();

    return {
      success: true,
      message: `Testbruker "${TEST_USER_DISPLAY_NAME}" seedet med komplett data!`,
      details,
    };
  } catch (error) {
    return {
      success: false,
      message: `Feil ved seeding: ${error instanceof Error ? error.message : String(error)}`,
      details,
    };
  }
}

/**
 * Oppsummering av testbrukeren (for visning i UI).
 */
export const TEST_USER_SUMMARY = {
  name: TEST_USER_DISPLAY_NAME,
  email: "emma.testersen@testvgs.no",
  school: "Nordvik videregående skole",
  personality: {
    bigFive: "Åpen (82), Planmessig (71), Utadvendt (55), Medmenneskelig (68), Stabil (35↓N)",
    riasec: "Investigative (85), Artistic (72), Social (65) — IAS-profil",
    cluster: "Creative",
    learningStyle: "Visuell",
    strengths: "Kreativitet, Nysgjerrighet, Utholdenhet",
  },
  grades: {
    count: GRADES.length,
    average: "~4.8",
    highlights: "IT1: 6, Fysikk 1: 5, Matte R1: 4→5",
  },
  gamification: {
    xp: TOTAL_XP,
    level: "Veiviser",
    achievements: EARNED_ACHIEVEMENTS.length,
    streak: 5,
  },
  conversations: CONVERSATIONS.length,
} as const;
