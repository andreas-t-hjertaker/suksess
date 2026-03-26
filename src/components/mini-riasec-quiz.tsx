"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ScaleIn } from "@/components/motion";

// ---------------------------------------------------------------------------
// Mini RIASEC — 3 spørsmål med bildebaserte valg
// ---------------------------------------------------------------------------

type RiasecCode = "R" | "I" | "A" | "S" | "E" | "C";

const RIASEC_LABELS: Record<RiasecCode, { name: string; desc: string; emoji: string }> = {
  R: { name: "Realistisk", desc: "Praktisk, liker å jobbe med hendene", emoji: "🔧" },
  I: { name: "Undersøkende", desc: "Nysgjerrig, liker å analysere og forstå", emoji: "🔬" },
  A: { name: "Kunstnerisk", desc: "Kreativ, liker å uttrykke deg", emoji: "🎨" },
  S: { name: "Sosial", desc: "Hjelpsom, liker å jobbe med mennesker", emoji: "🤝" },
  E: { name: "Enterprising", desc: "Overbevisende, liker å lede og påvirke", emoji: "🚀" },
  C: { name: "Konvensjonell", desc: "Organisert, liker struktur og orden", emoji: "📊" },
};

type Question = {
  text: string;
  options: { label: string; code: RiasecCode }[];
};

const questions: Question[] = [
  {
    text: "Hva høres mest spennende ut?",
    options: [
      { label: "Bygge noe med egne hender", code: "R" },
      { label: "Løse et komplisert puslespill", code: "I" },
      { label: "Designe noe visuelt", code: "A" },
      { label: "Hjelpe noen som sliter", code: "S" },
      { label: "Starte et eget prosjekt", code: "E" },
      { label: "Organisere et arrangement", code: "C" },
    ],
  },
  {
    text: "Hvilken skoletime liker du best?",
    options: [
      { label: "Gym eller sløyd", code: "R" },
      { label: "Naturfag eller matte", code: "I" },
      { label: "Kunst eller musikk", code: "A" },
      { label: "Samfunnsfag eller psykologi", code: "S" },
      { label: "Økonomi eller entreprenørskap", code: "E" },
      { label: "IT eller regnskap", code: "C" },
    ],
  },
  {
    text: "Hva gjør du helst i fritiden?",
    options: [
      { label: "Sport eller friluftsliv", code: "R" },
      { label: "Leser eller forsker på noe", code: "I" },
      { label: "Tegner, skriver eller spiller", code: "A" },
      { label: "Henger med venner eller frivillig arbeid", code: "S" },
      { label: "Planlegger, selger eller organiserer", code: "E" },
      { label: "Gaming eller samler på ting", code: "C" },
    ],
  },
];

export function MiniRiasecQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<RiasecCode[]>([]);

  function handleAnswer(code: RiasecCode) {
    const next = [...answers, code];
    setAnswers(next);
    if (next.length < questions.length) {
      setStep(step + 1);
    } else {
      setStep(questions.length); // Show result
    }
  }

  function reset() {
    setStep(0);
    setAnswers([]);
  }

  // Calculate top 2 codes
  function getTopCodes(): RiasecCode[] {
    const counts: Partial<Record<RiasecCode, number>> = {};
    for (const a of answers) {
      counts[a] = (counts[a] ?? 0) + 1;
    }
    return (Object.entries(counts) as [RiasecCode, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code)
      .slice(0, 2);
  }

  const isResult = step >= questions.length;

  return (
    <div className="mx-auto max-w-lg">
      <div className="glass-card rounded-2xl p-6 sm:p-8 bg-card dark:bg-card/60 border border-border/50 shadow-lg">
        {!isResult ? (
          <div key={step}>
            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i < step ? "bg-primary" : i === step ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground mb-2 font-display">
              Spørsmål {step + 1} av {questions.length}
            </p>
            <h3 className="text-fluid-lg font-display font-bold mb-5">
              {questions[step].text}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {questions[step].options.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleAnswer(opt.code)}
                  className="rounded-xl border border-border/60 bg-background/50 p-3.5 text-left text-sm transition-all hover:border-primary hover:bg-primary/5 hover:shadow-sm active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="text-lg mb-1 block">{RIASEC_LABELS[opt.code].emoji}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ScaleIn>
            <div className="text-center space-y-4">
              <div className="text-4xl mb-2">
                {getTopCodes().map((c) => RIASEC_LABELS[c].emoji).join(" ")}
              </div>
              <h3 className="text-fluid-lg font-display font-bold">
                Du virker som en{" "}
                <span className="text-primary">
                  {getTopCodes().map((c) => RIASEC_LABELS[c].name.toLowerCase()).join(" og ")}
                </span>{" "}
                type!
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {getTopCodes().map((c) => RIASEC_LABELS[c].desc).join(". ")}.
                Logg inn for full personlighetsprofil med Big Five og detaljerte karriereanbefalinger.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href="/login">
                  <Button className="gap-2 font-display">
                    Få full profil med Feide
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Ta på nytt
                </Button>
              </div>
            </div>
          </ScaleIn>
        )}
      </div>
    </div>
  );
}
