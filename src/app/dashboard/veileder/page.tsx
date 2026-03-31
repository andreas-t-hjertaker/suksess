"use client";

/**
 * AI-veileder — dedikert chatside med personalisert system-prompt
 * basert på brukerens Big Five, RIASEC og styrker.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useXp } from "@/hooks/use-xp";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import { FeatureGate } from "@/components/feature-gate";
import { useChatSession } from "@/modules/ai-assistant/hooks/use-chat";
import { ChatMessages } from "@/modules/ai-assistant/components/chat-messages";
import { ChatInput } from "@/modules/ai-assistant/components/chat-input";
import type { UserProfile } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// System-prompt builder med personlighetsdata
// ---------------------------------------------------------------------------

function buildVeilederPrompt(profile: UserProfile | null, displayName: string | null): string {
  const name = displayName || "eleven";
  const parts: string[] = [
    `Du er en personlig karriere- og utdanningsveileder for Suksess-plattformen.`,
    `Du snakker med ${name}.`,
    "",
    "Plattformens formål: Hjelpe norske videregående elever med karriere- og utdanningsvalg.",
    "",
    "Retningslinjer:",
    "- Svar alltid på norsk",
    "- Vær varm, støttende og oppmuntrende",
    "- Gi konkrete, handlingsrettede råd",
    "- Bruk markdown for formatering der det passer",
    "- Henvis til spesifikke utdanningsprogram og studieretninger ved navn",
    "- Bruk elevens personlighetsprofil aktivt i rådgivningen",
    "- Unngå generelle plattheter — tilpass råd til eleven",
  ];

  if (profile) {
    const riasecCode = getRiasecCode(profile.riasec);
    const topRiasec = Object.entries(profile.riasec)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ");

    const topBigFive = Object.entries(profile.bigFive)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ");

    parts.push(
      "",
      `=== ELEVENS PERSONLIGHETSPROFIL ===`,
      `RIASEC-kode: ${riasecCode}`,
      `Topp RIASEC-dimensjoner: ${topRiasec}`,
      `Topp Big Five-trekk: ${topBigFive}`,
    );

    if (profile.strengths?.length) {
      parts.push(`Styrker: ${profile.strengths.join(", ")}`);
    }
    if (profile.interests?.length) {
      parts.push(`Interesseområder: ${profile.interests.join(", ")}`);
    }
    if (profile.learningStyle) {
      parts.push(`Læringsstil: ${profile.learningStyle}`);
    }

    parts.push(
      "",
      "Bruk denne informasjonen til å gi personlig tilpassede råd.",
      "Nevn gjerne RIASEC-koden og hva den betyr for karrierevalg.",
    );
  } else {
    parts.push(
      "",
      "Eleven har ikke fullført personlighetsprofilen ennå.",
      "Oppmuntre dem til å fullføre onboarding for bedre personlig veiledning.",
    );
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Foreslåtte startspørsmål
// ---------------------------------------------------------------------------

const SUGGESTED_BASE = [
  "Hvilke karriereveier passer best til min RIASEC-profil?",
  "Hva kan jeg gjøre på videregående for å forberede meg best mulig?",
  "Hvilke studieprogram ved NTNU eller UiO bør jeg vurdere?",
  "Hvordan kan jeg bruke styrkene mine i arbeidslivet?",
  "Hva er forskjellen på bachelor og sivilingeniør?",
  "Hvordan søker jeg Samordna opptak?",
];

const SUGGESTED_WITH_PROFILE = (riasecCode: string) => [
  `Hva betyr RIASEC-koden ${riasecCode} for karrierevalg?`,
  "Hvilke yrker passer best til min personlighetsprofil?",
  "Hva bør jeg fokusere på i valg av studiespesialisering?",
  "Kan du forklare Big Five og hva det betyr for meg?",
  "Hvilke sektorer er mest aktuelle for min profil?",
  "Hva er de mest etterspurte yrkene innen min interesseprofil?",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function VeilederPage() {
  const { user } = useAuth();
  const { earnXp } = useXp();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  const systemPrompt = useMemo(
    () => buildVeilederPrompt(profile, user?.displayName ?? null),
    [profile, user?.displayName]
  );

  const context = useMemo(
    () => ({
      user: user
        ? { displayName: user.displayName, email: user.email, uid: user.uid }
        : undefined,
      appName: "Suksess",
      currentPath: "/dashboard/veileder",
    }),
    [user]
  );

  const { messages, sendMessage, clearMessages, isStreaming } = useChatSession(
    context,
    { systemPrompt }
  );

  const handleSend = useCallback((msg: string) => {
    earnXp("ai_chat");
    sendMessage(msg);
  }, [earnXp, sendMessage]);

  const suggestions = useMemo(() => {
    if (!profile?.riasec) return SUGGESTED_BASE;
    const code = getRiasecCode(profile.riasec);
    return SUGGESTED_WITH_PROFILE(code);
  }, [profile]);

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;

  return (
    <div className="flex flex-col -m-6 mb-[-5rem] md:mb-[-1.5rem] h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI-veileder</h1>
            <p className="text-xs text-muted-foreground">
              {profileLoading
                ? "Laster profil…"
                : profile
                ? `Personalisert for din RIASEC-profil ${riasecCode ?? ""}`
                : "Fullfør onboarding for personlig veiledning"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {riasecCode && (
            <Badge variant="outline" className="text-xs hidden sm:flex">
              {riasecCode}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            disabled={messages.length === 0}
            title="Tøm samtale"
            aria-label="Tøm samtale"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
            {/* Welcome */}
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">
                  Hei{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Jeg er din personlige karriere- og utdanningsveileder. Spør meg om alt fra valg av studiespesialisering til konkrete karriereveier.
                </p>
              </div>
            </div>

            {/* Suggested questions */}
            <div className="w-full max-w-lg space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center mb-3">
                Forslag til spørsmål
              </h3>
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={isStreaming}
                  className={cn(
                    "w-full rounded-xl border bg-card px-4 py-3 text-left text-sm transition-all",
                    "hover:bg-accent hover:border-primary/30 hover:-translate-x-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "flex items-center justify-between gap-2 group"
                  )}
                >
                  <span>{q}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            welcomeMessage="Hei! Jeg er din personlige veileder. Hva vil du snakke om?"
            userId={user?.uid}
          />
        )}
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder="Spør om karrierevalg, studier, karakterer…"
        />
      </div>
    </div>
  );
}

export default function VeilederPageGated() {
  return (
    <FeatureGate feature="ai-veileder-full">
      <VeilederPage />
    </FeatureGate>
  );
}
