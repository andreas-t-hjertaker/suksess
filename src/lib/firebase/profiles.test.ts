import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tester for Firestore profil-operasjoner (#180).
 *
 * Mocker Firebase SDK for å verifisere at profil CRUD-operasjoner
 * bruker korrekte stier og legger til timestamps.
 */

// Mock Firebase SDK
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((...segments: string[]) => ({ path: segments.join("/") }));
const mockCollection = vi.fn((...segments: string[]) => ({ path: segments.join("/") }));

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  enableMultiTabIndexedDbPersistence: () => Promise.resolve(),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  serverTimestamp: () => "SERVER_TS",
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock("./config", () => ({
  app: {},
}));

// Mock parseDoc
vi.mock("./parse-doc", () => ({
  parseDoc: vi.fn((snap: { exists: () => boolean; data: () => unknown }) => {
    if (!snap.exists()) return null;
    return snap.data();
  }),
}));

// Mock schemas
vi.mock("@/types/schemas", () => ({
  UserDocSchema: { parse: (d: unknown) => d },
  UserProfileSchema: { parse: (d: unknown) => d },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserDoc", () => {
  it("returnerer brukerdata for eksisterende bruker", async () => {
    const userData = {
      uid: "user1",
      displayName: "Ola Nordmann",
      email: "ola@skole.no",
      role: "student",
      tenantId: "skole-1",
      onboardingComplete: true,
    };

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => userData,
      ref: { path: "users/user1" },
    });

    const { getUserDoc } = await import("./profiles");
    const result = await getUserDoc("user1");

    expect(result).toEqual(userData);
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "users", "user1");
  });

  it("returnerer null for ikke-eksisterende bruker", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
      ref: { path: "users/missing" },
    });

    const { getUserDoc } = await import("./profiles");
    const result = await getUserDoc("missing");

    expect(result).toBeNull();
  });
});

describe("createUserDoc", () => {
  it("oppretter brukerdokument med timestamps", async () => {
    mockSetDoc.mockResolvedValue(undefined);

    const { createUserDoc } = await import("./profiles");
    await createUserDoc("user1", {
      uid: "user1",
      displayName: "Ola",
      email: "ola@skole.no",
      photoURL: null,
      role: "student",
      tenantId: "skole-1",
      onboardingComplete: false,
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        uid: "user1",
        displayName: "Ola",
        createdAt: "SERVER_TS",
        updatedAt: "SERVER_TS",
      })
    );
  });
});

describe("updateUserDoc", () => {
  it("oppdaterer brukerdokument med updatedAt", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    const { updateUserDoc } = await import("./profiles");
    await updateUserDoc("user1", { displayName: "Ny Ola" });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        displayName: "Ny Ola",
        updatedAt: "SERVER_TS",
      })
    );
  });
});

describe("subscribeToUserDoc", () => {
  it("registrerer sanntidslytter for brukerdokument", async () => {
    const unsubscribe = vi.fn();
    const userData = { uid: "user1", displayName: "Ola" };

    mockOnSnapshot.mockImplementation((_ref: unknown, cb: (snap: { exists: () => boolean; data: () => unknown; ref: { path: string } }) => void) => {
      cb({
        exists: () => true,
        data: () => userData,
        ref: { path: "users/user1" },
      });
      return unsubscribe;
    });

    const { subscribeToUserDoc } = await import("./profiles");
    const callback = vi.fn();
    const unsub = subscribeToUserDoc("user1", callback);

    expect(callback).toHaveBeenCalledWith(userData);
    expect(unsub).toBe(unsubscribe);
  });
});

describe("getUserProfile", () => {
  it("returnerer profil for eksisterende bruker", async () => {
    const profileData = {
      userId: "user1",
      bigFive: { openness: 75, conscientiousness: 60, extraversion: 50, agreeableness: 80, neuroticism: 30 },
      riasec: { realistic: 40, investigative: 70, artistic: 60, social: 80, enterprising: 30, conventional: 20 },
      strengths: ["kreativitet", "empati"],
      interests: ["teknologi"],
      learningStyle: "visual",
      clusterId: null,
    };

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => profileData,
      ref: { path: "profiles/user1" },
    });

    const { getUserProfile } = await import("./profiles");
    const result = await getUserProfile("user1");

    expect(result).toEqual(profileData);
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "profiles", "user1");
  });
});

describe("saveUserProfile", () => {
  it("lagrer profil med merge og timestamps", async () => {
    mockSetDoc.mockResolvedValue(undefined);

    const { saveUserProfile } = await import("./profiles");
    await saveUserProfile("user1", {
      userId: "user1",
      bigFive: { openness: 75, conscientiousness: 60, extraversion: 50, agreeableness: 80, neuroticism: 30 },
      riasec: { realistic: 40, investigative: 70, artistic: 60, social: 80, enterprising: 30, conventional: 20 },
      strengths: ["kreativitet"],
      interests: ["teknologi"],
      learningStyle: "visual",
      clusterId: null,
      lastUpdated: null,
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user1",
        lastUpdated: "SERVER_TS",
        updatedAt: "SERVER_TS",
      }),
      { merge: true }
    );
  });
});

describe("saveTestResult", () => {
  it("lagrer testresultat med alle timestamps", async () => {
    mockSetDoc.mockResolvedValue(undefined);

    const { saveTestResult } = await import("./profiles");
    await saveTestResult("user1", {
      userId: "user1",
      testType: "big_five",
      rawAnswers: { q1: 4, q2: 3 },
      scores: { openness: 75, conscientiousness: 60, extraversion: 50, agreeableness: 80, neuroticism: 30 },
      completedAt: null,
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        testType: "big_five",
        createdAt: "SERVER_TS",
        updatedAt: "SERVER_TS",
        completedAt: "SERVER_TS",
      })
    );
  });
});

describe("saveGrade", () => {
  it("lagrer karakter med timestamps", async () => {
    mockSetDoc.mockResolvedValue(undefined);

    const { saveGrade } = await import("./profiles");
    await saveGrade("user1", {
      userId: "user1",
      subject: "Matematikk 1T",
      fagkode: "MAT1015",
      grade: 5,
      term: "vt",
      year: 2026,
      programSubjectId: null,
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        subject: "Matematikk 1T",
        grade: 5,
        createdAt: "SERVER_TS",
        updatedAt: "SERVER_TS",
      })
    );
  });
});

describe("updateGrade", () => {
  it("oppdaterer karakter med updatedAt", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    const { updateGrade } = await import("./profiles");
    await updateGrade("user1", "grade1", { grade: 6 });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        grade: 6,
        updatedAt: "SERVER_TS",
      })
    );
  });
});

describe("saveConversation", () => {
  it("lagrer samtale med merge", async () => {
    mockSetDoc.mockResolvedValue(undefined);

    const { saveConversation } = await import("./profiles");
    await saveConversation("user1", "conv1", {
      title: "Karrierespørsmål",
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: "Karrierespørsmål",
        updatedAt: "SERVER_TS",
      }),
      { merge: true }
    );
  });
});
