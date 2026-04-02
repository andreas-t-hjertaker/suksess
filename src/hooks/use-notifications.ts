"use client";

/**
 * useNotifications — abonnerer på brukerens varslinger i Firestore.
 * Dokument-struktur: users/{uid}/notifications/{notifId}
 */

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { FirestoreNotifSchema } from "@/types/schemas";

export type NotificationType =
  | "achievement"
  | "xp"
  | "tip"
  | "deadline"
  | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date | null;
  link?: string;
};

export function useNotifications() {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, "users", firebaseUser.uid, "notifications");
    const q = query(ref, orderBy("createdAt", "desc"), limit(30));

    const unsub = onSnapshot(q, (snap) => {
      const items: Notification[] = snap.docs.reduce<Notification[]>((acc, d) => {
        const result = FirestoreNotifSchema.safeParse(d.data());
        if (!result.success) {
          console.warn(`[useNotifications] Valideringsfeil for ${d.ref.path}:`, result.error);
          return acc;
        }
        const data = result.data;
        acc.push({
          id: d.id,
          type: data.type,
          title: data.title,
          body: data.body,
          read: data.read ?? false,
          createdAt: (data.createdAt as { toDate?: () => Date } | null)?.toDate?.() ?? null,
          link: data.link,
        });
        return acc;
      }, []);
      setNotifications(items);
      setLoading(false);
    });

    return unsub;
  }, [firebaseUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(
    async (id: string) => {
      if (!firebaseUser) return;
      await updateDoc(
        doc(db, "users", firebaseUser.uid, "notifications", id),
        { read: true }
      );
    },
    [firebaseUser]
  );

  const markAllRead = useCallback(async () => {
    if (!firebaseUser) return;
    const batch = writeBatch(db);
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        batch.update(
          doc(db, "users", firebaseUser.uid, "notifications", n.id),
          { read: true }
        );
      });
    await batch.commit();
  }, [firebaseUser, notifications]);

  const addNotification = useCallback(
    async (notif: Omit<Notification, "id" | "createdAt" | "read">) => {
      if (!firebaseUser) return;
      await addDoc(
        collection(db, "users", firebaseUser.uid, "notifications"),
        {
          ...notif,
          read: false,
          createdAt: serverTimestamp(),
        }
      );
    },
    [firebaseUser]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    addNotification,
  };
}
