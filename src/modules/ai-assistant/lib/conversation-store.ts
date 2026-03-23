/**
 * Samtalepersistering — lagrer og henter samtalehistorikk fra Firestore.
 * Collection: users/{userId}/conversations/{convId}
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
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
    role: m.role,
    content: m.content,
    timestamp: m.timestamp?.toISOString() ?? new Date().toISOString(),
    sources: (m as unknown as Record<string, unknown>).sources ?? [],
  }));
  await updateDoc(ref, {
    messages: serialized,
    messageCount: messages.length,
    lastMessageAt: serverTimestamp(),
  });
}

/** Hent siste samtaler for bruker */
export async function getRecentConversations(
  userId: string,
  maxCount = 30
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

/** Last inn meldinger fra en eksisterende samtale */
export async function loadConversation(
  userId: string,
  conversationId: string
): Promise<{ title: string; messages: ChatMessage[] } | null> {
  const snap = await getDoc(doc(db, "users", userId, "conversations", conversationId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const messages: ChatMessage[] = (data.messages ?? []).map((m: Record<string, unknown>) => ({
    id: String(m.id ?? Math.random()),
    role: m.role as ChatMessage["role"],
    content: String(m.content ?? ""),
    timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),
    // sources is optional in ChatMessage and may be absent
    ...((m.sources != null) && { sources: m.sources }),
  }));
  return { title: data.title ?? "Samtale", messages };
}

/** Slett en samtale (GDPR rett til sletting) */
export async function deleteConversationById(userId: string, conversationId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "conversations", conversationId));
}
