"use client";

/**
 * FeedbackDialog — Sheet-basert tilbakemeldingsskjema.
 *
 * Støtter tre typer: feil (bug), forslag (idé), ros (positiv).
 * Samler automatisk teknisk kontekst og sender til Firestore.
 * Kan pre-fylles med feilinformasjon fra ErrorBoundary.
 */

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bug,
  Lightbulb,
  ThumbsUp,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedback } from "@/hooks/use-feedback";
import { toast } from "sonner";
import type {
  TilbakemeldingType,
  TilbakemeldingKilde,
  TilbakemeldingPrioritet,
} from "@/types/domain";

const TOAST_MELDINGER: Record<TilbakemeldingType, string> = {
  feil: "Feilrapporten er sendt — takk for hjelpen!",
  forslag: "Forslaget er sendt — vi setter pris på innspillet!",
  ros: "Tusen takk for de hyggelige ordene!",
};

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kilde som åpnet dialogen */
  kilde?: TilbakemeldingKilde;
  /** Pre-valgt type (f.eks. "feil" fra error-boundary) */
  initialType?: TilbakemeldingType;
  /** Pre-fylt feilinformasjon */
  feilKontekst?: {
    feilmelding?: string;
    stackTrace?: string;
    komponentStack?: string;
  };
};

const TYPE_CONFIG: {
  value: TilbakemeldingType;
  label: string;
  icon: typeof Bug;
  color: string;
}[] = [
  { value: "feil", label: "Feil", icon: Bug, color: "text-red-500" },
  {
    value: "forslag",
    label: "Forslag",
    icon: Lightbulb,
    color: "text-amber-500",
  },
  { value: "ros", label: "Ros", icon: ThumbsUp, color: "text-green-500" },
];

const PRIORITETER: { value: TilbakemeldingPrioritet; label: string }[] = [
  { value: "kritisk", label: "Kritisk" },
  { value: "hoy", label: "Høy" },
  { value: "middels", label: "Middels" },
  { value: "lav", label: "Lav" },
];

const PLACEHOLDER_TITTEL: Record<TilbakemeldingType, string> = {
  feil: "Kort beskrivelse av feilen",
  forslag: "Hva ønsker du deg?",
  ros: "Hva likte du?",
};

const PLACEHOLDER_BESKRIVELSE: Record<TilbakemeldingType, string> = {
  feil: "Hva skjedde? Hva forventet du? Hvilke steg reproduserer feilen?",
  forslag:
    "Beskriv ideen din og hvorfor den ville vært nyttig for deg og andre.",
  ros: "Fortell oss hva som fungerer bra — det motiverer oss!",
};

export function FeedbackDialog({
  open,
  onOpenChange,
  kilde = "fab",
  initialType,
  feilKontekst,
}: FeedbackDialogProps) {
  const { sendTilbakemelding, sender } = useFeedback();
  const [type, setType] = useState<TilbakemeldingType>(
    initialType ?? "forslag"
  );
  const [tittel, setTittel] = useState("");
  const [beskrivelse, setBeskrivelse] = useState("");
  const [prioritet, setPrioritet] = useState<TilbakemeldingPrioritet>("middels");
  const [visFeilDetaljer, setVisFeilDetaljer] = useState(false);
  const tittelRef = useRef<HTMLInputElement>(null);

  // Oppdater type hvis initialType endres (f.eks. fra error-boundary)
  useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  // Autofokus på tittel-feltet
  useEffect(() => {
    if (!open) return;
    // Liten delay for at Sheet-animasjonen skal fullføres
    const t = setTimeout(() => tittelRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [open]);

  function resetForm() {
    setTittel("");
    setBeskrivelse("");
    setPrioritet("middels");
    setVisFeilDetaljer(false);
    if (!initialType) setType("forslag");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tittel.trim()) return;

    const ok = await sendTilbakemelding({
      type,
      tittel: tittel.trim(),
      beskrivelse: beskrivelse.trim(),
      prioritet: type === "feil" ? prioritet : undefined,
      kilde,
      feilmelding: feilKontekst?.feilmelding,
      stackTrace: feilKontekst?.stackTrace,
      komponentStack: feilKontekst?.komponentStack,
    });

    if (ok) {
      toast.success(TOAST_MELDINGER[type]);
      resetForm();
      onOpenChange(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Gi tilbakemelding</SheetTitle>
          <SheetDescription>
            Hjelp oss å gjøre Suksess bedre for deg og andre elever.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Type-velger */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              {TYPE_CONFIG.map((t) => {
                const Icon = t.icon;
                const isActive = type === t.value;
                return (
                  <Button
                    key={t.value}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex-1 gap-1.5",
                      isActive && "ring-2 ring-ring ring-offset-1"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-current" : t.color
                      )}
                    />
                    {t.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Tittel */}
          <div className="space-y-2">
            <Label htmlFor="fb-tittel">Tittel</Label>
            <Input
              ref={tittelRef}
              id="fb-tittel"
              value={tittel}
              onChange={(e) => setTittel(e.target.value)}
              placeholder={PLACEHOLDER_TITTEL[type]}
              maxLength={200}
              required
              aria-required="true"
            />
          </div>

          {/* Beskrivelse */}
          <div className="space-y-2">
            <Label htmlFor="fb-beskrivelse">Beskrivelse</Label>
            <Textarea
              id="fb-beskrivelse"
              value={beskrivelse}
              onChange={(e) => setBeskrivelse(e.target.value)}
              placeholder={PLACEHOLDER_BESKRIVELSE[type]}
              maxLength={2000}
              rows={4}
            />
          </div>

          {/* Prioritet — kun for feil */}
          {type === "feil" && (
            <div className="space-y-2">
              <Label>Prioritet</Label>
              <div className="flex gap-1.5 flex-wrap">
                {PRIORITETER.map((p) => (
                  <Badge
                    key={p.value}
                    variant={prioritet === p.value ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer select-none",
                      prioritet === p.value && "ring-1 ring-ring"
                    )}
                    onClick={() => setPrioritet(p.value)}
                  >
                    {p.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Teknisk kontekst (kollapset) */}
          {feilKontekst?.feilmelding && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <button
                type="button"
                onClick={() => setVisFeilDetaljer(!visFeilDetaljer)}
                className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
              >
                <span>Teknisk informasjon (sendes med)</span>
                {visFeilDetaljer ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {visFeilDetaljer && (
                <pre className="mt-2 overflow-auto text-[10px] leading-tight text-muted-foreground">
                  {feilKontekst.feilmelding}
                  {feilKontekst.stackTrace &&
                    `\n\n${feilKontekst.stackTrace.slice(0, 500)}`}
                </pre>
              )}
            </div>
          )}

          {/* Send-knapp */}
          <Button
            type="submit"
            disabled={sender || !tittel.trim()}
            className="w-full"
          >
            {sender ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sender...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send tilbakemelding
              </>
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
