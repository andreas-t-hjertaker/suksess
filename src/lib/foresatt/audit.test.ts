/**
 * Tester for foresatt audit-logging (#106)
 */

import { describe, it, expect } from "vitest";
import {
  isValidAuditType,
  buildAuditAction,
  GUARDIAN_AUDIT_TYPES,
} from "./audit";

describe("isValidAuditType (#106)", () => {
  it("godtar alle gyldige audit-typer", () => {
    for (const type of GUARDIAN_AUDIT_TYPES) {
      expect(isValidAuditType(type)).toBe(true);
    }
  });

  it("har 5 definerte audit-typer", () => {
    expect(GUARDIAN_AUDIT_TYPES).toHaveLength(5);
  });

  it("avviser ugyldig type", () => {
    expect(isValidAuditType("invalid")).toBe(false);
    expect(isValidAuditType("")).toBe(false);
    expect(isValidAuditType("LINK_CREATED")).toBe(false); // case-sensitive
  });
});

describe("buildAuditAction (#106)", () => {
  it("bygger gyldig action", () => {
    const action = buildAuditAction("link_created", "parent-1", "student-1");
    expect(action.type).toBe("link_created");
    expect(action.parentUid).toBe("parent-1");
    expect(action.studentUid).toBe("student-1");
  });

  it("inkluderer metadata", () => {
    const action = buildAuditAction("consent_given", "p", "s", {
      consentVersion: "2026-03-01",
    });
    expect(action.metadata?.consentVersion).toBe("2026-03-01");
  });

  it("kaster feil for ugyldig type", () => {
    expect(() => buildAuditAction("invalid", "p", "s")).toThrow(
      "Ugyldig audit-type"
    );
  });

  it("kaster feil for manglende parentUid", () => {
    expect(() => buildAuditAction("link_created", "", "s")).toThrow("påkrevd");
  });

  it("kaster feil for manglende studentUid", () => {
    expect(() => buildAuditAction("link_created", "p", "")).toThrow("påkrevd");
  });
});
