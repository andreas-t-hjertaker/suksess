import { describe, it, expect } from "vitest";
import {
  scoreBigFive,
  scoreRiasec,
  scoreStrengths,
  getTopStrengths,
  getRiasecCode,
} from "./scoring";
import { BIG_FIVE_QUESTIONS, RIASEC_QUESTIONS, STRENGTH_QUESTIONS } from "./questions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sett alle svar i en dimensjon til samme verdi */
function answersForDimension(
  questions: { id: string; dimension: string }[],
  dimension: string,
  value: number
): Record<string, number> {
  return Object.fromEntries(
    questions.filter((q) => q.dimension === dimension).map((q) => [q.id, value])
  );
}

/** Bygg svar for alle Big Five-spørsmål med en fast verdi */
function allBigFiveAnswers(value: number): Record<string, number> {
  return Object.fromEntries(BIG_FIVE_QUESTIONS.map((q) => [q.id, value]));
}

// ---------------------------------------------------------------------------
// scoreBigFive
// ---------------------------------------------------------------------------

describe("scoreBigFive", () => {
  it("returnerer 50 for tomme svar", () => {
    const result = scoreBigFive({});
    expect(result.openness).toBe(50);
    expect(result.conscientiousness).toBe(50);
    expect(result.extraversion).toBe(50);
    expect(result.agreeableness).toBe(50);
    expect(result.neuroticism).toBe(50);
  });

  it("returnerer 100 for alle svar = 5 (uten reversed items)", () => {
    // Sett bare de ikke-reversed spørsmålene til 5
    const answers: Record<string, number> = {};
    for (const q of BIG_FIVE_QUESTIONS) {
      answers[q.id] = q.reversed ? 1 : 5; // reversed=1 → 6-1=5
    }
    const result = scoreBigFive(answers);
    expect(result.openness).toBe(100);
    expect(result.conscientiousness).toBe(100);
    expect(result.extraversion).toBe(100);
    expect(result.agreeableness).toBe(100);
    expect(result.neuroticism).toBe(100);
  });

  it("returnerer 0 for alle svar = 1 (uten reversed items)", () => {
    const answers: Record<string, number> = {};
    for (const q of BIG_FIVE_QUESTIONS) {
      answers[q.id] = q.reversed ? 5 : 1; // reversed=5 → 6-5=1
    }
    const result = scoreBigFive(answers);
    expect(result.openness).toBe(0);
    expect(result.conscientiousness).toBe(0);
  });

  it("normaliserer korrekt: gjennomsnitt 3 → 50", () => {
    const answers = allBigFiveAnswers(3);
    const result = scoreBigFive(answers);
    // For reversed items: 6-3=3, samme gjennomsnitt
    // normalize(3) = (3-1)/4 * 100 = 50
    expect(result.openness).toBe(50);
    expect(result.conscientiousness).toBe(50);
  });

  it("scorer bare besvarte spørsmål (partial answers)", () => {
    const q = BIG_FIVE_QUESTIONS.find((q) => q.dimension === "openness" && !q.reversed)!;
    const result = scoreBigFive({ [q.id]: 5 });
    // Kun ett spørsmål besvart med 5 → normalize(5) = 100
    expect(result.openness).toBe(100);
    // Andre dimensjoner uten svar → 50 (default)
    expect(result.conscientiousness).toBe(50);
  });

  it("håndterer reversed items korrekt", () => {
    const reversedQ = BIG_FIVE_QUESTIONS.find((q) => q.reversed)!;
    const result = scoreBigFive({ [reversedQ.id]: 1 });
    // reversed: 6-1=5, normalize(5)=100
    expect(result[reversedQ.dimension]).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Input-validering (#176)
// ---------------------------------------------------------------------------

describe("input-validering", () => {
  it("kaster feil for svar utenfor 1-5 (for høy)", () => {
    const q = BIG_FIVE_QUESTIONS[0];
    expect(() => scoreBigFive({ [q.id]: 6 })).toThrow("Ugyldig personlighetssvar");
  });

  it("kaster feil for svar utenfor 1-5 (for lav)", () => {
    const q = BIG_FIVE_QUESTIONS[0];
    expect(() => scoreBigFive({ [q.id]: 0 })).toThrow("Ugyldig personlighetssvar");
  });

  it("kaster feil for negative verdier", () => {
    const q = BIG_FIVE_QUESTIONS[0];
    expect(() => scoreBigFive({ [q.id]: -1 })).toThrow("Ugyldig personlighetssvar");
  });

  it("kaster feil for NaN", () => {
    const q = BIG_FIVE_QUESTIONS[0];
    expect(() => scoreBigFive({ [q.id]: NaN })).toThrow("Ugyldig personlighetssvar");
  });

  it("kaster feil for desimaltall", () => {
    const q = BIG_FIVE_QUESTIONS[0];
    expect(() => scoreBigFive({ [q.id]: 3.5 })).toThrow("Ugyldig personlighetssvar");
  });

  it("aksepterer gyldige svar (1-5)", () => {
    const q = BIG_FIVE_QUESTIONS[0];
    expect(() => scoreBigFive({ [q.id]: 1 })).not.toThrow();
    expect(() => scoreBigFive({ [q.id]: 3 })).not.toThrow();
    expect(() => scoreBigFive({ [q.id]: 5 })).not.toThrow();
  });

  it("validerer scoreRiasec input", () => {
    const q = RIASEC_QUESTIONS[0];
    expect(() => scoreRiasec({ [q.id]: 0 })).toThrow("Ugyldig personlighetssvar");
    expect(() => scoreRiasec({ [q.id]: 3 })).not.toThrow();
  });

  it("validerer scoreStrengths input", () => {
    expect(() => scoreStrengths({ "s1": 6 })).toThrow("Ugyldig personlighetssvar");
  });

  it("aksepterer tomme svar (returnerer defaults)", () => {
    expect(() => scoreBigFive({})).not.toThrow();
    expect(() => scoreRiasec({})).not.toThrow();
    expect(() => scoreStrengths({})).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// scoreRiasec
// ---------------------------------------------------------------------------

describe("scoreRiasec", () => {
  it("returnerer 50 for tomme svar", () => {
    const result = scoreRiasec({});
    for (const v of Object.values(result)) {
      expect(v).toBe(50);
    }
  });

  it("returnerer 100 for maks-svar", () => {
    const answers: Record<string, number> = {};
    for (const q of RIASEC_QUESTIONS) {
      answers[q.id] = q.reversed ? 1 : 5;
    }
    const result = scoreRiasec(answers);
    expect(result.realistic).toBe(100);
    expect(result.investigative).toBe(100);
    expect(result.social).toBe(100);
  });

  it("scorer uavhengige dimensjoner", () => {
    const answers = {
      ...answersForDimension(RIASEC_QUESTIONS, "social", 5),
      ...answersForDimension(RIASEC_QUESTIONS, "realistic", 1),
    };
    const result = scoreRiasec(answers);
    // social=5 → 100, realistic=1 → 0
    expect(result.social).toBe(100);
    expect(result.realistic).toBe(0);
    // Ubesvarte → 50
    expect(result.investigative).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// getRiasecCode
// ---------------------------------------------------------------------------

describe("getRiasecCode", () => {
  it("returnerer topp 3 koder sortert etter score", () => {
    const scores = {
      realistic: 80,
      investigative: 90,
      artistic: 70,
      social: 60,
      enterprising: 50,
      conventional: 40,
    };
    expect(getRiasecCode(scores)).toBe("IRA");
  });

  it("støtter tilpasset antall topp-koder", () => {
    const scores = {
      realistic: 80,
      investigative: 90,
      artistic: 70,
      social: 60,
      enterprising: 50,
      conventional: 40,
    };
    expect(getRiasecCode(scores, 2)).toBe("IR");
    expect(getRiasecCode(scores, 6)).toBe("IRASEC");
  });

  it("mapper riktige bokstaver", () => {
    const scores = {
      realistic: 100,
      investigative: 0,
      artistic: 0,
      social: 0,
      enterprising: 0,
      conventional: 0,
    };
    expect(getRiasecCode(scores, 1)).toBe("R");
  });
});

// ---------------------------------------------------------------------------
// getTopStrengths
// ---------------------------------------------------------------------------

describe("getTopStrengths", () => {
  it("returnerer topp N styrker sortert", () => {
    const scores = {
      kreativitet: 90,
      nysgjerrighet: 70,
      lederskap: 80,
      empati: 60,
      utholdenhet: 50,
      humor: 40,
      rettferdighet: 95,
    };
    const top3 = getTopStrengths(scores, 3);
    expect(top3).toEqual(["rettferdighet", "kreativitet", "lederskap"]);
  });

  it("default returnerer topp 3", () => {
    const scores = {
      kreativitet: 90,
      nysgjerrighet: 70,
      lederskap: 80,
      empati: 60,
      utholdenhet: 50,
      humor: 40,
      rettferdighet: 95,
    };
    expect(getTopStrengths(scores)).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// scoreStrengths
// ---------------------------------------------------------------------------

describe("scoreStrengths", () => {
  it("returnerer 50 for tomme svar", () => {
    const result = scoreStrengths({});
    for (const v of Object.values(result)) {
      expect(v).toBe(50);
    }
  });

  it("returnerer 100 for alle svar = 5", () => {
    const answers: Record<string, number> = {};
    for (const q of STRENGTH_QUESTIONS) {
      answers[q.id] = q.reversed ? 1 : 5;
    }
    const result = scoreStrengths(answers);
    for (const v of Object.values(result)) {
      expect(v).toBe(100);
    }
  });
});
