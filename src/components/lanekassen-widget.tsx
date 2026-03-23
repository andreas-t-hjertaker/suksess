/**
 * Lånekassen-widget for dashboard (Issue #59)
 *
 * Viser estimert studiefinansiering basert på valgt studie og bosted.
 * Deep-linker til Lånekassens offisielle kalkulator for nøyaktig beregning.
 */

"use client";

import { useState } from "react";
import { ExternalLink, GraduationCap, Home, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { beregnLanekassen, type StudieType, type Bosted } from "@/lib/studiedata/lanekassen";

const STUDIETYPE_LABELS: Record<StudieType, string> = {
  hoeyere: "Høyere utdanning (universitet/høgskole)",
  fagskole: "Fagskole",
  vgs_yrkesfag: "VGS yrkesfag",
  vgs_studieforberedende: "VGS studieforberedende",
};

export function LanekassenWidget() {
  const [studieType, setStudieType] = useState<StudieType>("hoeyere");
  const [bosted, setBosted] = useState<Bosted>("hjemme");

  const beregning = beregnLanekassen(studieType, bosted, 18, studieType === "vgs_yrkesfag");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-blue-600" />
          Studiefinansiering fra Lånekassen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Studietype</label>
            <Select
              value={studieType}
              onValueChange={(v) => setStudieType(v as StudieType)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STUDIETYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-sm">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Bosted</label>
            <Select
              value={bosted}
              onValueChange={(v) => setBosted(v as Bosted)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hjemme" className="text-sm">
                  <span className="flex items-center gap-1.5">
                    <Home className="h-3 w-3" /> Bor hjemme
                  </span>
                </SelectItem>
                <SelectItem value="borte" className="text-sm">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Bor borte fra foreldre
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Totalt per år</span>
            <span className="font-semibold">
              {beregning.totalPerAar.toLocaleString("nb-NO")} kr
            </span>
          </div>

          {beregning.stipendPerAar > 0 && beregning.lanPerAar > 0 && (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>• Stipend (skattefritt)</span>
                <span className="text-green-600 font-medium">
                  {beregning.stipendPerAar.toLocaleString("nb-NO")} kr
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>• Lån (tilbakebetales)</span>
                <span>{beregning.lanPerAar.toLocaleString("nb-NO")} kr</span>
              </div>
            </>
          )}

          {beregning.borteboerstipendPerAar && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>• Borteboerstipend</span>
              <span className="text-green-600 font-medium">
                {beregning.borteboerstipendPerAar.toLocaleString("nb-NO")} kr
              </span>
            </div>
          )}

          {beregning.utstyrsstipend && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>• Utstyrsstipend</span>
              <span className="text-green-600 font-medium">
                {beregning.utstyrsstipend.toLocaleString("nb-NO")} kr
              </span>
            </div>
          )}

          <div className="border-t pt-2 flex justify-between text-sm font-medium">
            <span>Ca. per måned</span>
            <span className="text-blue-600">
              {beregning.perManed.toLocaleString("nb-NO")} kr
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Estimat for {beregning.studieaar}. Faktisk støtte avhenger av foreldres inntekt,
          karakter og bosted. Satser fra Forskrift om utdanningsstøtte.
        </p>

        <a
          href={beregning.kalkulatorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Beregn nøyaktig på Lånekassen.no
        </a>
      </CardContent>
    </Card>
  );
}
