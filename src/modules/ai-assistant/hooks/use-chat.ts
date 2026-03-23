"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getModel } from "@/lib/firebase/ai";
import { generateId } from "@/lib/utils";
import { buildSystemPrompt } from "../lib/system-prompt";
import {
  createConversation,
  saveConversationMessages,
  loadConversation,
} from "../lib/conversation-store";
import type { ChatMessage, ChatConfig, AssistantContext } from "../types";

type FirebaseChatSession = ReturnType<ReturnType<typeof getModel>["startChat"]>;

export function useChatSession(
  context: AssistantContext,
  config?: ChatConfig & { initialConversationId?: string }
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const chatRef = useRef<FirebaseChatSession | null>(null);
  const contextRef = useRef(context);
  const conversationIdRef = useRef<string | null>(config?.initialConversationId ?? null);

  // Last inn eksisterende samtale ved mount hvis initialConversationId er oppgitt
  useEffect(() => {
    const uid = context.user?.uid;
    const convId = config?.initialConversationId;
    if (!uid || !convId) return;

    setIsLoadingHistory(true);
    loadConversation(uid, convId)
      .then((conv) => {
        if (conv && conv.messages.length > 0) {
          setMessages(conv.messages);
          conversationIdRef.current = convId;
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.initialConversationId, context.user?.uid]);

  // Debounced Firestore-persistering etter hver melding
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function schedulePersist(msgs: ChatMessage[]) {
    const uid = context.user?.uid;
    if (!uid) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        if (!conversationIdRef.current) {
          const firstUser = msgs.find((m) => m.role === "user");
          if (!firstUser) return;
          conversationIdRef.current = await createConversation(uid, firstUser.content);
        }
        await saveConversationMessages(uid, conversationIdRef.current, msgs);
      } catch {
        // Silently fail — logging er sekundært til brukeropplevelse
      }
    }, 1500);
  }

  // Rens timer ved avmontering
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  // Opprett ny chat-sesjon med gjeldende kontekst
  function createSession() {
    const systemPrompt = config?.systemPrompt
      ? config.systemPrompt
      : buildSystemPrompt(context, undefined);

    const model = getModel(config?.modelName);
    const session = model.startChat({
      systemInstruction: {
        role: "system" as const,
        parts: [{ text: systemPrompt }],
      },
    });
    chatRef.current = session;
    contextRef.current = context;
    return session;
  }

  // Sørg for at vi har en sesjon, opprett ny hvis kontekst har endret seg
  function getSession() {
    if (
      !chatRef.current ||
      contextRef.current.currentPath !== context.currentPath ||
      contextRef.current.user?.uid !== context.user?.uid
    ) {
      return createSession();
    }
    return chatRef.current;
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      const assistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const session = getSession();
        const result = await session.sendMessageStream(
          text.trim()
        );

        let fullText = "";
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullText += chunkText;
            const current = fullText;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: current }
                  : m
              )
            );
          }
        }

        // Marker streaming som ferdig og persister til Firestore
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          );
          schedulePersist(updated);
          return updated;
        });
      } catch (err) {
        // Ved feil, vis feilmelding som assistentens svar
        const errorMsg =
          err instanceof Error ? err.message : "Ukjent feil oppstod";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Beklager, noe gikk galt: ${errorMsg}`,
                  streaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStreaming, context]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    chatRef.current = null;
    conversationIdRef.current = null;
  }, []);

  return { messages, sendMessage, clearMessages, isStreaming, isLoadingHistory, conversationId: conversationIdRef };
}
