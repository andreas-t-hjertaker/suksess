"use client";

/**
 * FloatingQuestion — flytende personlighetsspørsmål-kort.
 *
 * Vises nederst til venstre på dashboard (speiler FeedbackFAB til høyre).
 * Viser ett spørsmål om gangen med Likert-skala.
 * Maks 3 per økt, kan avvises for resten av økten.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFloatingQuestions } from "@/hooks/use-floating-questions";

const LIKERT = [
  { value: 1, label: "Stemmer ikke", emoji: "😕" },
  { value: 2, label: "Stemmer lite", emoji: "🤔" },
  { value: 3, label: "Nøytral", emoji: "😐" },
  { value: 4, label: "Stemmer godt", emoji: "🙂" },
  { value: 5, label: "Stemmer svært godt", emoji: "🤩" },
];

export function FloatingQuestion() {
  const {
    currentQuestion,
    answeredCount,
    totalCount,
    answer,
    dismiss,
    isComplete,
    loading,
  } = useFloatingQuestions();

  const [answering, setAnswering] = useState(false);
  const [lastAnswered, setLastAnswered] = useState<number | null>(null);

  // Vis ikke hvis det ikke er noe spørsmål å vise
  if (loading || !currentQuestion || isComplete) return null;

  async function handleAnswer(value: number) {
    if (answering) return;
    setLastAnswered(value);
    setAnswering(true);

    await answer(value);

    // Kort pause for animasjon
    setTimeout(() => {
      setAnswering(false);
      setLastAnswered(null);
    }, 400);
  }

  return (
    <AnimatePresence>
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: -40, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: -40, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-20 left-4 z-[9999] w-80 sm:bottom-6 sm:left-64"
      >
        <div className="rounded-xl border border-border bg-popover p-4 shadow-xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-medium text-muted-foreground">
                Bli kjent med deg selv
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={dismiss}
              aria-label="Skjul spørsmål for denne økten"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Spørsmål */}
          <AnimatePresence mode="wait">
            <motion.p
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-3 text-sm font-medium leading-snug"
            >
              {currentQuestion.text}
            </motion.p>
          </AnimatePresence>

          {/* Likert-knapper */}
          <div
            className="mb-3 flex gap-1.5"
            role="radiogroup"
            aria-label={`Svar på: ${currentQuestion.text}`}
          >
            {LIKERT.map((l) => (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={lastAnswered === l.value}
                aria-label={`${l.value} — ${l.label}`}
                onClick={() => handleAnswer(l.value)}
                disabled={answering}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center rounded-lg border text-base transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  "hover:border-primary/50 hover:bg-primary/5 hover:scale-110",
                  lastAnswered === l.value
                    ? "border-primary bg-primary/10 scale-110 shadow-sm"
                    : "border-border",
                  answering && lastAnswered !== l.value && "opacity-50"
                )}
              >
                <span aria-hidden="true">{l.emoji}</span>
              </button>
            ))}
          </div>

          {/* Footer med progress */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {answeredCount} / {totalCount} besvart
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(answeredCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
