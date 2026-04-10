"use client";

/**
 * useFloatingQuestions — hook for progressiv personlighetskartlegging.
 *
 * Viser ett spørsmål om gangen i et flytende kort på dashboardet.
 * Maks 3 spørsmål per økt. Brukeren kan avvise for resten av økten.
 * Svar lagres inkrementelt til Firestore.
 * Scorer beregnes automatisk når alle spørsmål i en kategori er besvart.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { nowISO } from "@/lib/utils/time";
import {
  BIG_FIVE_QUESTIONS,
  RIASEC_QUESTIONS,
  STRENGTH_QUESTIONS,
  type PersonalityQuestion,
} from "@/lib/personality/questions";
import {
  scoreBigFive,
  scoreRiasec,
  scoreStrengths,
  getTopStrengths,
  type RawAnswers,
} from "@/lib/personality/scoring";
import { saveTestResult } from "@/lib/firebase/profiles";

const SESSION_ANSWERED_KEY = "suksess-questions-answered-session";
const SESSION_DISMISSED_KEY = "suksess-questions-dismissed";
const MAX_PER_SESSION = 3;

const ALL_QUESTIONS: (PersonalityQuestion & { type: "bigfive" | "riasec" | "strengths" })[] =
  buildInterleavedQueue();

/** Bygg en blandet kø: veksler mellom Big Five, RIASEC og Strengths */
function buildInterleavedQueue() {
  const bf = BIG_FIVE_QUESTIONS.map((q) => ({ ...q, type: "bigfive" as const }));
  const ri = RIASEC_QUESTIONS.map((q) => ({ ...q, type: "riasec" as const }));
  const st = STRENGTH_QUESTIONS.map((q) => ({ ...q, type: "strengths" as const }));

  const queues: (PersonalityQuestion & { type: "bigfive" | "riasec" | "strengths" })[][] =
    [bf, ri, st];
  const result: (PersonalityQuestion & { type: "bigfive" | "riasec" | "strengths" })[] = [];
  let idx = 0;

  while (queues.some((q) => q.length > 0)) {
    const queue = queues[idx % queues.length];
    if (queue.length > 0) {
      result.push(queue.shift()!);
    }
    idx++;
  }

  return result;
}

/** Sjekk om alle spørsmål i en kategori er besvart */
function isCategoryComplete(
  answers: RawAnswers,
  type: "bigfive" | "riasec" | "strengths"
): boolean {
  const questions =
    type === "bigfive"
      ? BIG_FIVE_QUESTIONS
      : type === "riasec"
        ? RIASEC_QUESTIONS
        : STRENGTH_QUESTIONS;
  return questions.every((q) => answers[q.id] !== undefined);
}

function getSessionAnswered(): number {
  try {
    return parseInt(sessionStorage.getItem(SESSION_ANSWERED_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function setSessionAnswered(count: number) {
  try {
    sessionStorage.setItem(SESSION_ANSWERED_KEY, String(count));
  } catch {
    // Ignorer
  }
}

function isSessionDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function setSessionDismissed() {
  try {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
  } catch {
    // Ignorer
  }
}

export type FloatingQuestionState = {
  /** Nåværende spørsmål å vise, eller null hvis ingen */
  currentQuestion: (PersonalityQuestion & { type: "bigfive" | "riasec" | "strengths" }) | null;
  /** Antall besvarte spørsmål totalt */
  answeredCount: number;
  /** Totalt antall spørsmål (84) */
  totalCount: number;
  /** Besvare nåværende spørsmål med en Likert-verdi (1-5) */
  answer: (value: number) => Promise<void>;
  /** Avvis flytende spørsmål for resten av økten */
  dismiss: () => void;
  /** Om brukeren har avvist for denne økten */
  isDismissed: boolean;
  /** Om alle spørsmål er besvart */
  isComplete: boolean;
  /** Om hooken laster data fra Firestore */
  loading: boolean;
};

export function useFloatingQuestions(): FloatingQuestionState {
  const { firebaseUser } = useAuth();
  const [answers, setAnswers] = useState<RawAnswers>({});
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const savingRef = useRef(false);

  // Last eksisterende svar fra Firestore
  useEffect(() => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    const loadAnswers = async () => {
      try {
        const snap = await getDoc(
          doc(db, "users", firebaseUser.uid, "onboarding", "answers")
        );
        if (snap.exists()) {
          const data = snap.data();
          setAnswers(data.answers || {});
        }
      } catch {
        // Ignorer — starter med tomt
      }
      setSessionCount(getSessionAnswered());
      setIsDismissed(isSessionDismissed());
      setLoading(false);
    };

    loadAnswers();
  }, [firebaseUser]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = ALL_QUESTIONS.length; // 84
  const isComplete = answeredCount >= totalCount;

  // Finn neste ubesvarte spørsmål
  const currentQuestion =
    !isComplete && sessionCount < MAX_PER_SESSION && !isDismissed
      ? ALL_QUESTIONS.find((q) => answers[q.id] === undefined) ?? null
      : null;

  const answer = useCallback(
    async (value: number) => {
      if (!firebaseUser || !currentQuestion || savingRef.current) return;
      savingRef.current = true;

      const newAnswers = { ...answers, [currentQuestion.id]: value };
      setAnswers(newAnswers);

      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      setSessionAnswered(newSessionCount);

      try {
        // Lagre svar inkrementelt til Firestore
        await setDoc(
          doc(db, "users", firebaseUser.uid, "onboarding", "answers"),
          {
            answers: newAnswers,
            [`answeredAt.${currentQuestion.id}`]: nowISO(),
            lastAnswered: serverTimestamp(),
            totalAnswered: Object.keys(newAnswers).length,
          },
          { merge: true }
        );

        // Sjekk om en kategori er ferdig og lagre scorer
        for (const type of ["bigfive", "riasec", "strengths"] as const) {
          if (isCategoryComplete(newAnswers, type)) {
            await saveScoresForType(firebaseUser.uid, newAnswers, type);
          }
        }
      } catch {
        // Svar er allerede oppdatert lokalt — Firestore-lagring kan retries
      }

      savingRef.current = false;
    },
    [firebaseUser, currentQuestion, answers, sessionCount]
  );

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setSessionDismissed();
  }, []);

  return {
    currentQuestion,
    answeredCount,
    totalCount,
    answer,
    dismiss,
    isDismissed,
    isComplete,
    loading,
  };
}

// ---------------------------------------------------------------------------
// Lagre scorer når en kategori er komplett
// ---------------------------------------------------------------------------

async function saveScoresForType(
  userId: string,
  answers: RawAnswers,
  type: "bigfive" | "riasec" | "strengths"
) {
  try {
    // Filtrer ut kun relevante svar for denne testtypen
    const filterAnswers = (ids: string[]): RawAnswers => {
      const filtered: RawAnswers = {};
      for (const id of ids) {
        if (answers[id] !== undefined) filtered[id] = answers[id];
      }
      return filtered;
    };

    if (type === "bigfive") {
      const relevant = filterAnswers(BIG_FIVE_QUESTIONS.map((q) => q.id));
      const scores = scoreBigFive(relevant);
      await saveTestResult(userId, {
        userId,
        testType: "big_five",
        rawAnswers: relevant,
        scores,
        completedAt: null,
      });
      await setDoc(
        doc(db, "profiles", userId),
        { userId, bigFive: scores, lastUpdated: serverTimestamp() },
        { merge: true }
      );
    } else if (type === "riasec") {
      const relevant = filterAnswers(RIASEC_QUESTIONS.map((q) => q.id));
      const scores = scoreRiasec(relevant);
      await saveTestResult(userId, {
        userId,
        testType: "riasec",
        rawAnswers: relevant,
        scores,
        completedAt: null,
      });
      await setDoc(
        doc(db, "profiles", userId),
        { userId, riasec: scores, lastUpdated: serverTimestamp() },
        { merge: true }
      );
    } else {
      const relevant = filterAnswers(STRENGTH_QUESTIONS.map((q) => q.id));
      const scores = scoreStrengths(relevant);
      const topStrengths = getTopStrengths(scores);
      await saveTestResult(userId, {
        userId,
        testType: "strengths",
        rawAnswers: relevant,
        scores,
        completedAt: null,
      });
      await setDoc(
        doc(db, "profiles", userId),
        { userId, strengths: topStrengths, lastUpdated: serverTimestamp() },
        { merge: true }
      );
    }

    // Gi XP for fullført test
    const xpDoc = doc(db, "users", userId, "gamification", "xp");
    const xpSnap = await getDoc(xpDoc);
    const currentXp = xpSnap.exists() ? xpSnap.data().totalXp || 0 : 0;
    const currentAchievements = xpSnap.exists()
      ? xpSnap.data().earnedAchievements || []
      : [];

    await setDoc(
      xpDoc,
      {
        totalXp: currentXp + 30,
        earnedAchievements: currentAchievements.includes("test_taker")
          ? currentAchievements
          : [...currentAchievements, "test_taker"],
      },
      { merge: true }
    );
  } catch {
    // Score-lagring feiler stille — data er lagret i answers-dokumentet
  }
}
