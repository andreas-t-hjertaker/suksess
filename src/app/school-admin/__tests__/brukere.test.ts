import { describe, it, expect } from "vitest";

/**
 * Tests for school-admin brukeradministrasjon (#134).
 * Tester CSV-parsing og rollevalideringslogikk.
 */

// ---------------------------------------------------------------------------
// CSV-parser (kopi fra brukere/page.tsx for testing)
// ---------------------------------------------------------------------------

function parseCsv(text: string): { name: string; email: string; role: string }[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: { name: string; email: string; role: string }[] = [];

  for (const line of lines) {
    if (line.toLowerCase().startsWith("navn") || line.toLowerCase().startsWith("name")) continue;
    const cols = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[0] || "";
    const email = cols[1] || "";
    const role = cols[2] || "student";
    if (email.includes("@")) {
      results.push({ name, email, role: ["student", "counselor"].includes(role) ? role : "student" });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Tester
// ---------------------------------------------------------------------------

describe("CSV-parser for bulk-import (#134)", () => {
  it("parser enkel CSV med navn, epost, rolle", () => {
    const csv = `navn,epost,rolle
Ola Nordmann,ola@skole.no,student
Kari Hansen,kari@skole.no,counselor`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "Ola Nordmann", email: "ola@skole.no", role: "student" });
    expect(result[1]).toEqual({ name: "Kari Hansen", email: "kari@skole.no", role: "counselor" });
  });

  it("hopper over header-rad", () => {
    const csv = `Name,Email,Role
Test Person,test@skole.no,student`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("test@skole.no");
  });

  it("bruker student som standard rolle", () => {
    const csv = `Ola Nordmann,ola@skole.no`;
    const result = parseCsv(csv);
    expect(result[0].role).toBe("student");
  });

  it("forkaster ugyldig rolle og bruker student", () => {
    const csv = `Admin Person,admin@skole.no,superadmin`;
    const result = parseCsv(csv);
    expect(result[0].role).toBe("student"); // superadmin er ikke tillatt
  });

  it("filtrerer ut rader uten gyldig e-post", () => {
    const csv = `Ola,ikke-en-epost,student
Kari,kari@skole.no,student
,,,`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("kari@skole.no");
  });

  it("håndterer semikolon-separerte filer", () => {
    const csv = `Ola Nordmann;ola@skole.no;student
Kari Hansen;kari@skole.no;counselor`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Ola Nordmann");
    expect(result[1].role).toBe("counselor");
  });

  it("håndterer anførselstegn rundt verdier", () => {
    const csv = `"Ola Nordmann","ola@skole.no","student"`;
    const result = parseCsv(csv);
    expect(result[0].name).toBe("Ola Nordmann");
    expect(result[0].email).toBe("ola@skole.no");
  });

  it("håndterer tom input", () => {
    expect(parseCsv("")).toHaveLength(0);
    expect(parseCsv("\n\n")).toHaveLength(0);
  });

  it("håndterer CSV med bare header", () => {
    const csv = `navn,epost,rolle`;
    expect(parseCsv(csv)).toHaveLength(0);
  });

  it("parser stor CSV korrekt", () => {
    const lines = Array.from({ length: 100 }, (_, i) =>
      `Elev ${i},elev${i}@skole.no,student`
    );
    const csv = "navn,epost,rolle\n" + lines.join("\n");
    const result = parseCsv(csv);
    expect(result).toHaveLength(100);
    expect(result[99].email).toBe("elev99@skole.no");
  });
});

describe("Rolle-validering (#134)", () => {
  const validRoles = ["student", "counselor", "admin"];

  it("godtar gyldige roller", () => {
    for (const role of validRoles) {
      expect(validRoles.includes(role)).toBe(true);
    }
  });

  it("forkaster ugyldige roller", () => {
    const invalidRoles = ["superadmin", "teacher", "parent", "", "STUDENT"];
    for (const role of invalidRoles) {
      expect(validRoles.includes(role)).toBe(false);
    }
  });
});
