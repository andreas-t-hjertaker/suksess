"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getModel } from "@/lib/firebase/ai";
import { generateId } from "@/lib/utils";
import { buildSystemPrompt } from "../lib/system-prompt";
import {
  detectCrisis,
  detectAndRemovePii,
  detectInjection,
  checkRateLimit,
  checkMinorSafety,
  shouldShowAiReminder,
  checkSessionLength,
  AI_REMINDER_MESSAGE,
  MINOR_SAFETY_SYSTEM_PROMPT,
  type SessionWarning,
} from "@/lib/ai/safety";
import { retrieveRagContext } from "@/lib/ai/rag-pipeline";
import {
  createConversation,
  saveConversationMessages,
  getConversationMessages,
} from "../lib/conversation-store";
import { saveChatFeedback } from "../lib/feedback-store";
import type { ChatMessage, ChatConfig, AssistantContext, FeedbackRating, FeedbackReason } from "../types";

type FirebaseChatSession = ReturnType<ReturnType<typeof getModel>["startChat"]>;

export function useChatSession(
  context: AssistantContext,
  config?: ChatConfig
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<SessionWarning | null>(null);
  const chatRef = useRef<FirebaseChatSession | null>(null);
  const contextRef = useRef(context);
  const conversationIdRef = useRef<string | null>(null);
  const creatingConversationRef = useRef<Promise<string> | null>(null);
  const messageCountRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const warned30Ref = useRef(false);
  const warned60Ref = useRef(false);

  // Debounced Firestore-persistering etter hver melding
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function schedulePersist(msgs: ChatMessage[]) {
    const uid = context.user?.uid;
    if (!uid) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        if (!conversationIdRef.current) {
          // Beskytt mot race condition ved raske meldinger
          if (!creatingConversationRef.current) {
            const firstUser = msgs.find((m) => m.role === "user");
            if (!firstUser) return;
            creatingConversationRef.current = createConversation(uid, firstUser.content);
          }
          conversationIdRef.current = await creatingConversationRef.current;
          creatingConversationRef.current = null;
        }
        await saveConversationMessages(uid, conversationIdRef.current, msgs);
      } catch {
        creatingConversationRef.current = null;
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
      : buildSystemPrompt(context, MINOR_SAFETY_SYSTEM_PROMPT);

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

      // Safety: Rate limiting
      const rateCheck = checkRateLimit();
      if (!rateCheck.allowed) {
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          { id: generateId(), role: "assistant" as const, content: rateCheck.message!, timestamp: new Date() },
        ]);
        return;
      }

      // Safety: Krisedeteksjon — bypass LLM
      const crisis = detectCrisis(text.trim());
      if (crisis.isCrisis) {
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          { id: generateId(), role: "user" as const, content: text.trim(), timestamp: new Date() },
          { id: generateId(), role: "assistant" as const, content: crisis.response!, timestamp: new Date() },
        ]);
        return;
      }

      // Safety: Prompt-injeksjonsdeteksjon
      if (detectInjection(text.trim())) {
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          { id: generateId(), role: "user" as const, content: text.trim(), timestamp: new Date() },
          { id: generateId(), role: "assistant" as const, content: "Jeg kan kun hjelpe med karriere- og utdanningsspørsmål. Hva lurer du på?", timestamp: new Date() },
        ]);
        return;
      }

      // Safety: Alderstilpassede guardrails for mindreårige (#141)
      const minorCheck = checkMinorSafety(text.trim());
      if (minorCheck.blocked) {
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          { id: generateId(), role: "user" as const, content: text.trim(), timestamp: new Date() },
          { id: generateId(), role: "assistant" as const, content: minorCheck.response!, timestamp: new Date() },
        ]);
        return;
      }

      // Safety: Sesjonslengde-varsel (#141)
      const sessionCheck = checkSessionLength(
        sessionStartRef.current,
        warned30Ref.current,
        warned60Ref.current
      );
      if (sessionCheck) {
        setSessionWarning(sessionCheck);
        if (sessionCheck.level === "gentle") warned30Ref.current = true;
        if (sessionCheck.level === "strong") warned60Ref.current = true;
      }

      // Safety: PII-filtrering — fjern personnummer, telefon, e-post
      const { sanitized } = detectAndRemovePii(text.trim());

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
        // RAG: Hent kontekst fra Weaviate (graceful degradation)
        let messageToSend = sanitized;
        try {
          const ragContext = await retrieveRagContext(sanitized);
          if (ragContext.contextBlock) {
            messageToSend = `${ragContext.contextBlock}\n\n---\nBrukerspørsmål: ${sanitized}`;
          }
        } catch {
          // RAG-feil skal ikke stoppe chat — graceful degradation
        }

        const session = getSession();
        const result = await session.sendMessageStream(
          messageToSend
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

        // Oppdater meldingsteller og marker streaming som ferdig
        messageCountRef.current += 1;
        setMessages((prev) => {
          let updated = prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          );

          // AI-påminnelse (#141): vis periodisk melding om at dette er en AI
          if (shouldShowAiReminder(messageCountRef.current)) {
            updated = [
              ...updated,
              { id: generateId(), role: "assistant" as const, content: AI_REMINDER_MESSAGE, timestamp: new Date() },
            ];
          }

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

  const loadConversation = useCallback(
    async (conversationId: string) => {
      const uid = context.user?.uid;
      if (!uid) return;
      try {
        const restored = await getConversationMessages(uid, conversationId);
        setMessages(restored);
        conversationIdRef.current = conversationId;
        chatRef.current = null; // Ny sesjon med ny kontekst
      } catch {
        // Silently fail
      }
    },
    [context.user?.uid]
  );

  const sendFeedback = useCallback(
    async (messageId: string, rating: FeedbackRating, reason?: FeedbackReason) => {
      const uid = context.user?.uid;
      if (!uid) return;

      // Oppdater lokal state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, feedback: rating, feedbackReason: reason ?? null }
            : m
        )
      );

      // Lagre til Firestore — bruk oppdatert state for å unngå stale closure
      let messageContent = "";
      setMessages((prev) => {
        const message = prev.find((m) => m.id === messageId);
        messageContent = message?.content?.slice(0, 500) ?? "";
        return prev;
      });
      await saveChatFeedback({
        userId: uid,
        conversationId: conversationIdRef.current,
        messageId,
        rating,
        reason: reason ?? null,
        messageContent,
      });
    },
    [context.user?.uid]
  );

  return { messages, sendMessage, sendFeedback, clearMessages, loadConversation, isStreaming, sessionWarning, conversationId: conversationIdRef.current };
}
