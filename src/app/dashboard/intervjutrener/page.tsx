"use client";

/**
 * AI Intervjutrener — øv på jobbintervju med AI (Issue #132)
 *
 * Lar eleven øve på jobbintervju med en AI-simulering:
 * - Velg bransje/stilling
 * - AI stiller typiske intervjuspørsmål
 * - Eleven svarer muntlig (tekst)
 * - AI gir tilbakemelding og tips
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiDisclosure } from "@/components/ai-disclosure";
import {
  Send,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Loader2,
  User,
  Bot,
  Briefcase,
  Coffee,
  Stethoscope,
  Code,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type InterviewCategory = {
  id: string;
  title: string;
  description: string;
  icon: typeof Briefcase;
  questions: string[];
};

type InterviewMessage = {
  role: "interviewer" | "candidate";
  content: string;
  feedback?: string;
};

// ---------------------------------------------------------------------------
// Intervjukategorier med spørsmål
// ---------------------------------------------------------------------------

const INTERVIEW_CATEGORIES: InterviewCategory[] = [
  {
    id: "general",
    title: "Generelt jobbintervju",
    description: "Vanlige spørsmål som stilles i de fleste jobbintervjuer.",
    icon: Briefcase,
    questions: [
      "Kan du fortelle litt om deg selv?",
      "Hvorfor søker du på denne stillingen?",
      "Hva er dine største styrker?",
      "Hva er din største svakhet, og hvordan jobber du med den?",
      "Hvor ser du deg selv om 5 år?",
      "Fortell om en utfordring du har overvunnet.",
      "Hvorfor skal vi velge deg fremfor andre kandidater?",
      "Har du noen spørsmål til oss?",
    ],
  },
  {
    id: "tech",
    title: "IT og teknologi",
    description: "Spørsmål for teknologistillinger og IT-bransjen.",
    icon: Code,
    questions: [
      "Fortell om et teknisk prosjekt du er stolt av.",
      "Hvordan holder du deg oppdatert på ny teknologi?",
      "Beskriv hvordan du feilsøker et problem.",
      "Foretrekker du å jobbe alene eller i team?",
      "Hva motiverer deg i arbeid med teknologi?",
      "Fortell om en gang du måtte lære noe nytt raskt.",
    ],
  },
  {
    id: "health",
    title: "Helse og omsorg",
    description: "Spørsmål for helsefaglige stillinger.",
    icon: Stethoscope,
    questions: [
      "Hvorfor vil du jobbe innen helse?",
      "Hvordan håndterer du stressende situasjoner?",
      "Fortell om en gang du viste empati i en vanskelig situasjon.",
      "Hvordan forholder du deg til taushetsplikt?",
      "Hva gjør du hvis du er uenig med en kollega om pasientbehandling?",
      "Hvordan tar du vare på din egen mentale helse?",
    ],
  },
  {
    id: "creative",
    title: "Kreative yrker",
    description: "Spørsmål for design, media og kreative stillinger.",
    icon: Palette,
    questions: [
      "Fortell om din kreative prosess.",
      "Vis oss et prosjekt du er stolt av og forklar valgene dine.",
      "Hvordan håndterer du kritikk på arbeidet ditt?",
      "Hvordan balanserer du kreativ frihet med kundens ønsker?",
      "Hvilke verktøy og teknikker bruker du mest?",
      "Hva inspirerer deg i arbeidet ditt?",
    ],
  },
  {
    id: "student",
    title: "Sommerjobb / deltid",
    description: "For deg som søker din første jobb eller sommerjobb.",
    icon: Coffee,
    questions: [
      "Fortell litt om deg selv og hva du gjør på fritiden.",
      "Hvorfor vil du jobbe her?",
      "Hva slags erfaring har du, selv om det ikke er fra jobb?",
      "Hvordan er du å samarbeide med?",
      "Hva gjør du hvis du ikke forstår en arbeidsoppgave?",
      "Når kan du begynne, og hva er tilgjengeligheten din?",
    ],
  },
];

// ---------------------------------------------------------------------------
// AI-tilbakemelding via Gemini
// ---------------------------------------------------------------------------

async function generateAIFeedback(
  question: string,
  answer: string,
  category: string
): Promise<string> {
  try {
    const { generateText } = await import("@/lib/firebase/ai");

    const prompt = `Du er en intervjutrener for norske VGS-elever. Gi kort, konkret tilbakemelding på et intervjusvar.

Intervjukategori: ${category}
Spørsmål: "${question}"
Kandidatens svar: "${answer}"

Gi tilbakemelding på 2–4 setninger. Vær oppmuntrende men ærlig. Inkluder:
1. Noe bra med svaret
2. Ett konkret forbedringstips (f.eks. STAR-metoden, mer spesifikt eksempel, bedre struktur)

Skriv på norsk bokmål. Ikke bruk markdown.`;

    return await generateText(prompt);
  } catch {
    // Fallback ved AI-feil
    if (answer.length < 20) {
      return "Prøv å utdype svaret ditt mer. Et godt intervjusvar er vanligvis 1–2 minutter langt.";
    }
    const tips = [
      "Bra svar! Husk å gi konkrete eksempler fra egne erfaringer.",
      "Godt strukturert. Prøv STAR-metoden: Situasjon, Oppgave, Aksjon, Resultat.",
      "Fint at du er personlig. Koble svaret til stillingen du søker på.",
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntervjutrenerPage() {
  const [selectedCategory, setSelectedCategory] = useState<InterviewCategory | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startInterview(category: InterviewCategory) {
    setSelectedCategory(category);
    setCurrentQuestionIndex(0);
    setMessages([
      {
        role: "interviewer",
        content: `Velkommen til intervjuet! Jeg er din intervjutrener for «${category.title}». La oss øve — jeg stiller deg typiske spørsmål, og du svarer som i et ekte intervju. Her er det første spørsmålet:`,
      },
      {
        role: "interviewer",
        content: category.questions[0],
      },
    ]);
    setInterviewComplete(false);
  }

  async function handleSend() {
    if (!input.trim() || !selectedCategory) return;
    const answer = input.trim();
    setInput("");

    // Legg til kandidatens svar
    const question = selectedCategory.questions[currentQuestionIndex];
    setMessages((prev) => [...prev, { role: "candidate", content: answer }]);

    // Generer AI-tilbakemelding
    setIsThinking(true);
    setError(null);

    let feedback: string;
    try {
      feedback = await generateAIFeedback(question, answer, selectedCategory.title);
    } catch {
      setError("Kunne ikke generere tilbakemelding. Prøv igjen.");
      setIsThinking(false);
      return;
    }
    setMessages((prev) => [
      ...prev,
      { role: "interviewer", content: feedback, feedback: "tip" },
    ]);

    // Neste spørsmål
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < selectedCategory.questions.length) {
      setMessages((prev) => [
        ...prev,
        { role: "interviewer", content: selectedCategory!.questions[nextIndex] },
      ]);
      setCurrentQuestionIndex(nextIndex);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "interviewer",
          content:
            "Det var det siste spørsmålet! Bra jobba med øvingen. " +
            "Husk: jo mer du øver, jo tryggere blir du i ekte intervjuer. " +
            "Du kan starte på nytt eller velge en annen kategori.",
        },
      ]);
      setInterviewComplete(true);
    }

    setIsThinking(false);
  }

  function resetInterview() {
    setSelectedCategory(null);
    setMessages([]);
    setCurrentQuestionIndex(0);
    setInterviewComplete(false);
    setInput("");
  }

  // Kategorivalg
  if (!selectedCategory) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Intervjutrener</h1>
          <p className="text-muted-foreground">
            Øv på jobbintervju med AI. Velg en kategori for å komme i gang.
          </p>
        </div>

        <AiDisclosure featureId="career-advisor" compact />

        <div className="grid gap-3 sm:grid-cols-2">
          {INTERVIEW_CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => startInterview(cat)} className="text-left" aria-label={`Start intervjuøvelse: ${cat.title}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <cat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{cat.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {cat.questions.length} spørsmål
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Intervjuvisning
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <selectedCategory.icon className="h-5 w-5" />
            {selectedCategory.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            Spørsmål {Math.min(currentQuestionIndex + 1, selectedCategory.questions.length)} av {selectedCategory.questions.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetInterview}>
          <RotateCcw className="h-4 w-4" />
          Ny øvelse
        </Button>
      </div>

      {/* Fremgang */}
      <div
        role="progressbar"
        aria-valuenow={currentQuestionIndex + 1}
        aria-valuemin={1}
        aria-valuemax={selectedCategory.questions.length}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{
            width: `${((currentQuestionIndex + (interviewComplete ? 1 : 0)) / selectedCategory.questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Meldinger */}
      <div className="space-y-3 min-h-[40vh]" role="log" aria-label="Intervjusamtale">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              msg.role === "candidate" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                msg.role === "interviewer"
                  ? "bg-primary/10"
                  : "bg-muted"
              )}
            >
              {msg.role === "interviewer" ? (
                <Bot className="h-4 w-4 text-primary" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "candidate"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : msg.feedback
                    ? "rounded-bl-md bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100 border border-green-200 dark:border-green-800"
                    : "rounded-bl-md bg-muted"
              )}
            >
              {msg.feedback && (
                <Badge variant="outline" className="mb-1 text-[10px] text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  Tips
                </Badge>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Feilmelding */}
      {error && (
        <ErrorState message={error} onRetry={() => setError(null)} />
      )}

      {/* Input */}
      {!interviewComplete && (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv svaret ditt her…"
            className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            aria-label="Ditt intervjusvar"
            disabled={isThinking}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isThinking} aria-label="Send svar">
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {interviewComplete && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="flex items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">Øvingen er fullført!</p>
              <p className="text-sm text-muted-foreground">
                Du svarte på alle {selectedCategory.questions.length} spørsmål. Bra jobba!
              </p>
            </div>
            <Button variant="outline" onClick={resetInterview}>
              Øv mer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
