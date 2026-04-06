/**
 * Firestore CRUD for UserProfile og UserDoc.
 * Bygger på de generiske hjelperne i firestore.ts.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firestore";
import { parseDoc } from "./parse-doc";
import { UserDocSchema, UserProfileSchema } from "@/types/schemas";
import type { UserDoc, UserProfile, TestResult, Grade, Conversation } from "@/types/domain";

// ---------------------------------------------------------------------------
// UserDoc — users/{userId}
// ---------------------------------------------------------------------------

export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", userId));
  return parseDoc(snap, UserDocSchema) as UserDoc | null;
}

export async function createUserDoc(
  userId: string,
  data: Omit<UserDoc, "createdAt" | "updatedAt">
): Promise<void> {
  await setDoc(doc(db, "users", userId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserDoc(
  userId: string,
  data: Partial<Omit<UserDoc, "createdAt" | "updatedAt">>
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToUserDoc(
  userId: string,
  callback: (user: UserDoc | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "users", userId), (snap) => {
    callback(parseDoc(snap, UserDocSchema) as UserDoc | null);
  });
}

// ---------------------------------------------------------------------------
// UserProfile — profiles/{userId}
// ---------------------------------------------------------------------------

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "profiles", userId));
  return parseDoc(snap, UserProfileSchema) as UserProfile | null;
}

export async function saveUserProfile(
  userId: string,
  data: Omit<UserProfile, "createdAt" | "updatedAt">
): Promise<void> {
  await setDoc(
    doc(db, "profiles", userId),
    {
      ...data,
      lastUpdated: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToUserProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "profiles", userId),
    (snap) => {
      callback(parseDoc(snap, UserProfileSchema) as UserProfile | null);
    },
    onError
  );
}

// ---------------------------------------------------------------------------
// TestResult — users/{userId}/testResults/{resultId}
// ---------------------------------------------------------------------------

export async function saveTestResult(
  userId: string,
  result: Omit<TestResult, "createdAt" | "updatedAt">
): Promise<void> {
  const ref = doc(collection(db, "users", userId, "testResults"));
  await setDoc(ref, {
    ...result,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Grade — users/{userId}/grades/{gradeId}
// ---------------------------------------------------------------------------

export async function saveGrade(
  userId: string,
  grade: Omit<Grade, "createdAt" | "updatedAt">
): Promise<void> {
  const ref = doc(collection(db, "users", userId, "grades"));
  await setDoc(ref, {
    ...grade,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateGrade(
  userId: string,
  gradeId: string,
  data: Partial<Omit<Grade, "createdAt" | "updatedAt">>
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "grades", gradeId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Conversation — users/{userId}/conversations/{convId}
// ---------------------------------------------------------------------------

export async function saveConversation(
  userId: string,
  convId: string,
  data: Partial<Omit<Conversation, "createdAt" | "updatedAt">>
): Promise<void> {
  await setDoc(
    doc(db, "users", userId, "conversations", convId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
