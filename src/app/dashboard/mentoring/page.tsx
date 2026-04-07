"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Users, Heart, Search, Star, ChevronRight } from "lucide-react";

const EXAMPLE_MENTORS = [
  {
    id: "m1",
    name: "Kari Nordmann",
    occupation: "Sivilingeniør, Equinor",
    riasecCode: "RIA",
    matchPercent: 92,
    bio: "10 års erfaring innen energiteknologi. Brenner for å veilede unge som er nysgjerrige på realfag og ingeniøryrker.",
  },
  {
    id: "m2",
    name: "Ole Hansen",
    occupation: "UX-designer, Bekk",
    riasecCode: "AIS",
    matchPercent: 85,
    bio: "Utdannet fra NTNU med master i interaksjonsdesign. Elsker å hjelpe kreative sjeler med å finne sin vei i tech.",
  },
  {
    id: "m3",
    name: "Fatima Al-Rashid",
    occupation: "Lege, Haukeland",
    riasecCode: "SIA",
    matchPercent: 78,
    bio: "Spesialist i allmennmedisin med erfaring fra både sykehus og forskning. Mentor for elever som vurderer helsefag.",
  },
];

export default function MentoringPage() {
  const [hasMatch, _setHasMatch] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Karrierementoring
        </h1>
        <p className="text-muted-foreground mt-1">
          Bli koblet med en mentor basert på din RIASEC-profil. Snakk med noen
          som jobber med det du drømmer om.
        </p>
      </div>

      {error && (
        <ErrorState message={error} />
      )}

      {!hasMatch && (
        <EmptyState
          icon={Heart}
          title="Ingen mentormatch ennå"
          description="Fullfør RIASEC-profilen din for å bli matchet med en mentor som passer dine interesser og karrieremål."
          action={{ label: "Finn mentor", href: "/dashboard/analyse" }}
          secondaryAction={{
            label: "Lær mer om mentoring",
            href: "/dashboard/mentoring#info",
          }}
        />
      )}

      <section aria-labelledby="mentors-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="mentors-heading"
            className="text-lg font-semibold font-display"
          >
            <Users className="inline-block h-5 w-5 mr-2 text-primary" aria-hidden="true" />
            Anbefalte mentorer
          </h2>
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" aria-hidden="true" />
            Søk mentorer
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLE_MENTORS.map((mentor) => (
            <Card key={mentor.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{mentor.name}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {mentor.matchPercent}% match
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {mentor.occupation}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">RIASEC: {mentor.riasecCode}</Badge>
                  <div className="flex items-center gap-0.5" aria-label="Verifisert mentor">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">Verifisert</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground flex-1">
                  {mentor.bio}
                </p>
                <Button variant="outline" size="sm" className="w-full mt-auto">
                  Se profil
                  <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
