/**
 * Samtalepersistering — lagrer og henter samtalehistorikk fra Firestore.
 * Collection: users/{userId}/conversations/{convId}
 */

import {
  collection,
  addDoc,
  updateDoc,
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
    sources: m.sources ?? [],
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
