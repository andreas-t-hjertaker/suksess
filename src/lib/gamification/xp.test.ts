import { describe, it, expect } from "vitest";
import {
  getLevelForXp,
  getNextLevel,
  getXpProgress,
  isFeatureUnlocked,
  LEVELS,
} from "./xp";

describe("getLevelForXp", () => {
  it("returnerer nybegynner for 0 XP", () => {
    expect(getLevelForXp(0).name).toBe("nybegynner");
  });

  it("returnerer nybegynner for 99 XP", () => {
    expect(getLevelForXp(99).name).toBe("nybegynner");
  });

  it("returnerer utforsker for 100 XP", () => {
    expect(getLevelForXp(100).name).toBe("utforsker");
  });

  it("returnerer utforsker for 299 XP", () => {
    expect(getLevelForXp(299).name).toBe("utforsker");
  });

  it("returnerer veiviser for 300 XP", () => {
    expect(getLevelForXp(300).name).toBe("veiviser");
  });

  it("returnerer mester for 600 XP", () => {
    expect(getLevelForXp(600).name).toBe("mester");
  });

  it("returnerer mester for svært høy XP", () => {
    expect(getLevelForXp(99999).name).toBe("mester");
  });
});

describe("getNextLevel", () => {
  it("nybegynner → utforsker", () => {
    expect(getNextLevel("nybegynner")?.name).toBe("utforsker");
  });

  it("utforsker → veiviser", () => {
    expect(getNextLevel("utforsker")?.name).toBe("veiviser");
  });

  it("veiviser → mester", () => {
    expect(getNextLevel("veiviser")?.name).toBe("mester");
  });

  it("mester → null (siste nivå)", () => {
    expect(getNextLevel("mester")).toBeNull();
  });
});

describe("getXpProgress", () => {
  it("beregner fremgang fra 0 i nybegynner-nivå", () => {
    const progress = getXpProgress(0);
    expect(progress.current).toBe(0);
    expect(progress.percent).toBe(0);
  });

  it("beregner 50% fremgang midt i et nivå", () => {
    // nybegynner: 0–99, neste er 100. Midtpunkt = 50
    const progress = getXpProgress(50);
    expect(progress.current).toBe(50);
    expect(progress.needed).toBe(100); // 100-0=100
    expect(progress.percent).toBe(50);
  });

  it("returnerer 100% og needed=0 på mester-nivå", () => {
    const progress = getXpProgress(1000);
    expect(progress.percent).toBe(100);
    expect(progress.needed).toBe(0);
  });

  it("begrenser percent til 100", () => {
    const progress = getXpProgress(599);
    expect(progress.percent).toBeLessThanOrEqual(100);
  });

  it("beregner fremgang ved nivågrense", () => {
    // 100 XP = starten på utforsker (minXp=100, nextLevel.minXp=300)
    const progress = getXpProgress(100);
    expect(progress.current).toBe(0);
    expect(progress.needed).toBe(200); // 300-100
    expect(progress.percent).toBe(0);
  });
});

describe("isFeatureUnlocked", () => {
  it("karakterer er tilgjengelig fra nybegynner", () => {
    expect(isFeatureUnlocked("karakterer", 0)).toBe(true);
  });

  it("karrierestiutforsker er låst for nybegynner", () => {
    expect(isFeatureUnlocked("karrierestiutforsker", 50)).toBe(false);
  });

  it("karrierestiutforsker låses opp på utforsker-nivå", () => {
    expect(isFeatureUnlocked("karrierestiutforsker", 100)).toBe(true);
  });

  it("ai-veileder-full er låst for utforsker", () => {
    expect(isFeatureUnlocked("ai-veileder-full", 150)).toBe(false);
  });

  it("ai-veileder-full låses opp på veiviser-nivå", () => {
    expect(isFeatureUnlocked("ai-veileder-full", 300)).toBe(true);
  });

  it("cv-builder er kun for mester-nivå", () => {
    expect(isFeatureUnlocked("cv-builder", 599)).toBe(false);
    expect(isFeatureUnlocked("cv-builder", 600)).toBe(true);
  });

  it("ukjent feature returnerer false", () => {
    expect(isFeatureUnlocked("ikke-eksisterende-feature", 9999)).toBe(false);
  });
});

describe("LEVELS-struktur", () => {
  it("har 4 nivåer", () => {
    expect(LEVELS).toHaveLength(4);
  });

  it("nivåene er sortert stigende på minXp", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minXp).toBeGreaterThan(LEVELS[i - 1].minXp);
    }
  });

  it("hvert nivå starter der forrige slutter + 1", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minXp).toBe(LEVELS[i - 1].maxXp + 1);
    }
  });
});
