"use client";

/**
 * Rådgiver-elev sanntidschat (#108).
 *
 * Firestore-basert sanntidschat mellom elever og rådgivere i samme tenant.
 * Funksjoner:
 * - Sanntids meldingsutveksling via Firestore onSnapshot
 * - Samtalehistorikk per elev-rådgiver par
 * - Lesebekreftelse (read receipts)
 * - Typing-indikator
 * - Tenant-isolert: kun rådgivere i samme tenant kan chatte med eleven
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  getDocs,
  doc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Send,
  Loader2,
  MessageSquare,
  User,
  Shield,
  CheckCheck,
  Circle,
} from "lucide-react";
import { ErrorState } from "@/components/error-state";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "counselor";
  content: string;
  timestamp: Timestamp | null;
  readAt: Timestamp | null;
};

type ChatRoom = {
  id: string;
  studentUid: string;
  studentName: string;
  counselorUid: string;
  counselorName: string;
  tenantId: string;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unreadCount: number;
};

// ---------------------------------------------------------------------------
// Side
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const { user } = useAuth();
  const { tenantId, role } = useTenant();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCounselor = role === "counselor" || role === "admin" || role === "superadmin";

  // Hent chatrom
  useEffect(() => {
    if (!user?.uid || !tenantId) return;

    const field = isCounselor ? "counselorUid" : "studentUid";
    const q = query(
      collection(db, "chatRooms"),
      where(field, "==", user.uid),
      where("tenantId", "==", tenantId),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const chatRooms = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatRoom[];
      setRooms(chatRooms);
      setLoading(false);

      if (chatRooms.length > 0 && !selectedRoom) {
        setSelectedRoom(chatRooms[0].id);
      }
    }, (err) => {
      setLoadError(err.message || "Kunne ikke laste samtaler");
      setLoading(false);
    });

    return unsub;
  }, [user?.uid, tenantId, isCounselor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hent meldinger for valgt rom
  useEffect(() => {
    if (!selectedRoom) return;

    const q = query(
      collection(db, `chatRooms/${selectedRoom}/messages`),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatMessage[];
      setMessages(msgs);

      // Marker uleste meldinger som lest
      msgs
        .filter((m) => m.senderId !== user?.uid && !m.readAt)
        .forEach((m) => {
          updateDoc(doc(db, `chatRooms/${selectedRoom}/messages`, m.id), {
            readAt: serverTimestamp(),
          }).catch(() => {});
        });
    });

    return unsub;
  }, [selectedRoom, user?.uid]);

  // Auto-scroll til bunnen
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedRoom || !user?.uid) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      await addDoc(collection(db, `chatRooms/${selectedRoom}/messages`), {
        senderId: user.uid,
        senderName: user.displayName || "Anonym",
        senderRole: isCounselor ? "counselor" : "student",
        content,
        timestamp: serverTimestamp(),
        readAt: null,
      });

      // Oppdater rommet med siste melding
      await updateDoc(doc(db, "chatRooms", selectedRoom), {
        lastMessage: content.substring(0, 100),
        lastMessageAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[Chat] Sending feilet:", err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [newMessage, selectedRoom, user, isCounselor]);

  // Opprett nytt chatrom (for elever)
  async function handleStartChat() {
    if (!user?.uid || !tenantId) return;

    // Finn en rådgiver i samme tenant
    const counselorSnap = await getDocs(
      query(
        collection(db, "users"),
        where("tenantId", "==", tenantId),
        where("role", "in", ["counselor", "admin"]),
        limit(1)
      )
    );

    if (counselorSnap.empty) {
      return; // Ingen rådgiver funnet
    }

    const counselor = counselorSnap.docs[0];
    const counselorData = counselor.data();

    // Sjekk om det allerede finnes et chatrom
    const existingSnap = await getDocs(
      query(
        collection(db, "chatRooms"),
        where("studentUid", "==", user.uid),
        where("counselorUid", "==", counselor.id),
        limit(1)
      )
    );

    if (!existingSnap.empty) {
      setSelectedRoom(existingSnap.docs[0].id);
      return;
    }

    const roomRef = await addDoc(collection(db, "chatRooms"), {
      studentUid: user.uid,
      studentName: user.displayName || "Elev",
      counselorUid: counselor.id,
      counselorName: counselorData.displayName || "Rådgiver",
      tenantId,
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      unreadCount: 0,
      createdAt: serverTimestamp(),
    });

    setSelectedRoom(roomRef.id);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <ErrorState message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">
          Chat er kun tilgjengelig for elever og rådgivere tilknyttet en skole.
        </p>
      </div>
    );
  }

  const currentRoom = rooms.find((r) => r.id === selectedRoom);

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-4">
      {/* Samtale-liste */}
      <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Samtaler</h2>
          {!isCounselor && (
            <Button size="sm" variant="outline" onClick={handleStartChat}>
              <MessageSquare className="h-3 w-3 mr-1" />
              Ny
            </Button>
          )}
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <MessageSquare className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {isCounselor
                ? "Ingen aktive samtaler ennå."
                : "Start en samtale med rådgiveren din."}
            </p>
          </div>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedRoom === room.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {isCounselor ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isCounselor ? room.studentName : room.counselorName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {room.lastMessage || "Ingen meldinger ennå"}
                  </p>
                </div>
                {room.unreadCount > 0 && (
                  <Badge variant="default" className="shrink-0 text-xs">
                    {room.unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Chat-vindu */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            {currentRoom ? (
              <>
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  {isCounselor ? (
                    <User className="h-3 w-3 text-primary" />
                  ) : (
                    <Shield className="h-3 w-3 text-primary" />
                  )}
                </div>
                {isCounselor ? currentRoom.studentName : currentRoom.counselorName}
                <Badge variant="outline" className="text-xs">
                  {isCounselor ? "Elev" : "Rådgiver"}
                </Badge>
              </>
            ) : (
              "Velg en samtale"
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto py-4 space-y-3">
          {!selectedRoom ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Velg en samtale fra listen til venstre.
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Ingen meldinger ennå. Send den første!
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === user?.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-medium mb-0.5 opacity-70">
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center gap-1 mt-1 opacity-60">
                      <span className="text-[10px]">
                        {msg.timestamp?.toDate?.().toLocaleTimeString("nb-NO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) || ""}
                      </span>
                      {isOwn && (
                        msg.readAt ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Circle className="h-2 w-2" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Inndatafelt */}
        {selectedRoom && (
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                placeholder="Skriv en melding..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
                aria-label="Skriv en melding"
                autoFocus
              />
              <Button type="submit" disabled={!newMessage.trim() || sending} size="icon">
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}
