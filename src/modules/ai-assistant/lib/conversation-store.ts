/**
 * Samtalepersistering — lagrer og henter samtalehistorikk fra Firestore.
 * Collection: users/{userId}/conversations/{convId}
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { ChatMessage } from "../types";

export type StoredConversation = {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
};

/** Opprett ny samtale og returner ID */
export async function createConversation(
  userId: string,
  firstMessage: string
): Promise<string> {
  const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
  const ref = await addDoc(
    collection(db, "users", userId, "conversations"),
    {
      title,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      messageCount: 0,
      messages: [],
    }
  );
  return ref.id;
}

/** Lagre meldingsliste til eksisterende samtale */
export async function saveConversationMessages(
  userId: string,
  conversationId: string,
  messages: ChatMessage[]
): Promise<void> {
  const ref = doc(db, "users", userId, "conversations", conversationId);
  const serialized = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp?.toISOString() ?? new Date().toISOString(),
  }));
  await updateDoc(ref, {
    messages: serialized,
    messageCount: messages.length,
    lastMessageAt: serverTimestamp(),
  });
}

/** Hent meldinger for en spesifikk samtale */
export async function getConversationMessages(
  userId: string,
  conversationId: string
): Promise<ChatMessage[]> {
  const ref = doc(db, "users", userId, "conversations", conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];

  const data = snap.data();
  const messages = (data.messages ?? []) as Array<{
    id?: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
  }>;

  return messages.map((m, i) => ({
    id: m.id ?? `restored_${i}`,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
  }));
}

/** Slett en samtale (GDPR rett til sletting) */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  const ref = doc(db, "users", userId, "conversations", conversationId);
  await deleteDoc(ref);
}

/** Hent siste samtaler for bruker */
export async function getRecentConversations(
  userId: string,
  maxCount = 10
): Promise<StoredConversation[]> {
  const q = query(
    collection(db, "users", userId, "conversations"),
    orderBy("lastMessageAt", "desc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "Samtale",
      createdAt: data.createdAt?.toDate() ?? new Date(),
      lastMessageAt: data.lastMessageAt?.toDate() ?? new Date(),
      messageCount: data.messageCount ?? 0,
    };
  });
}
