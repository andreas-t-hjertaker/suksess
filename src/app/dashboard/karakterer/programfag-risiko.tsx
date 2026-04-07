"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Programfag-risikoanalyse (issue #10)
// ---------------------------------------------------------------------------

const KEY_SUBJECTS: { name: string; fagkode: string; required: string[] }[] = [
  {
    name: "Matematikk R2 (for tekniske studier)",
    fagkode: "MAT3206",
    required: ["Sivilingeniør, datateknikk", "Sivilingeniør, elektronikk", "Informatikk (bachelor)", "Fysikk (bachelor)", "Matematikk (bachelor)"],
  },
  {
    name: "Matematikk R1 (for mange studier)",
    fagkode: "MAT3205",
    required: ["Sivilingeniør, bygg- og miljøteknikk", "Farmasi (master)", "Informatikk (bachelor)"],
  },
  {
    name: "Fysikk (for ingeniørstudier)",
    fagkode: "FYS3101",
    required: ["Sivilingeniør, datateknikk", "Sivilingeniør, elektronikk"],
  },
  {
    name: "Kjemi (for medisin/farmasi)",
    fagkode: "KJE3101",
    required: ["Medisin", "Farmasi (master)", "Odontologi"],
  },
  {
    name: "Biologi (for helsefag)",
    fagkode: "BIO3101",
    required: ["Medisin", "Veterinærmedisin", "Ernæring (bachelor)"],
  },
];

export function ProgramfagRisiko({ grades }: { grades: { fagkode: string | null; subject: string }[] }) {
  const fagkoder = new Set(grades.map((g) => g.fagkode).filter(Boolean));

  const missing = KEY_SUBJECTS.filter((s) => !fagkoder.has(s.fagkode));
  const present = KEY_SUBJECTS.filter((s) => fagkoder.has(s.fagkode));

  if (missing.length === 0) return null;

  return (
    <Card className="border-orange-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" aria-hidden="true" />
          <CardTitle className="text-base">Programfag-risikoanalyse</CardTitle>
        </div>
        <CardDescription>
          Basert på fagkodene dine mangler du nøkkelfag for visse studier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {present.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Du har:</p>
            {present.map((s) => (
              <div key={s.fagkode} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Du mangler (uten fagkode):</p>
          {missing.map((s) => (
            <div key={s.fagkode} className="space-y-0.5">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-medium">{s.name}</span>
                  <p className="text-xs text-muted-foreground">
                    Kreves for: {s.required.slice(0, 2).join(", ")}
                    {s.required.length > 2 ? ` og ${s.required.length - 2} til` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground border-t pt-2">
          Tips: Legg til fagkode (f.eks. MAT3206) når du registrerer karakterer for å aktivere denne analysen fullt ut.
        </p>
      </CardContent>
    </Card>
  );
}
