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
import {
  Briefcase,
  MapPin,
  Calendar,
  Building2,
  Filter,
} from "lucide-react";

type FilterType = "alle" | "laerling" | "sommerjobb" | "trainee" | "deltid";

const FILTER_LABELS: Record<FilterType, string> = {
  alle: "Alle",
  laerling: "Lærlingplass",
  sommerjobb: "Sommerjobb",
  trainee: "Trainee",
  deltid: "Deltid",
};

const EXAMPLE_LISTINGS = [
  {
    id: "j1",
    title: "Lærling automasjon",
    company: "Equinor ASA",
    location: "Stavanger",
    type: "laerling" as FilterType,
    riasecMatch: "RIE",
    matchPercent: 91,
    deadline: "15. mai 2026",
  },
  {
    id: "j2",
    title: "Sommerjobb frontend-utvikling",
    company: "Bekk Consulting",
    location: "Oslo",
    type: "sommerjobb" as FilterType,
    riasecMatch: "IAC",
    matchPercent: 87,
    deadline: "1. april 2026",
  },
  {
    id: "j3",
    title: "Trainee helseteknologi",
    company: "Helse Vest IKT",
    location: "Bergen",
    type: "trainee" as FilterType,
    riasecMatch: "SIA",
    matchPercent: 82,
    deadline: "30. april 2026",
  },
  {
    id: "j4",
    title: "Deltid butikkmedarbeider",
    company: "Coop Mega",
    location: "Trondheim",
    type: "deltid" as FilterType,
    riasecMatch: "ESC",
    matchPercent: 68,
    deadline: "Løpende",
  },
];

export default function StillingerPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("alle");

  const filteredListings =
    activeFilter === "alle"
      ? EXAMPLE_LISTINGS
      : EXAMPLE_LISTINGS.filter((l) => l.type === activeFilter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Stillinger for deg
        </h1>
        <p className="text-muted-foreground mt-1">
          Lærlingplasser, sommerjobber og trainee-stillinger matchet mot din
          RIASEC-profil.
        </p>
      </div>

      {/* Filtre */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer stillingstype">
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {(Object.keys(FILTER_LABELS) as FilterType[]).map((type) => (
          <Button
            key={type}
            variant={activeFilter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(type)}
            aria-pressed={activeFilter === type}
          >
            {FILTER_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* Stillingskort */}
      {filteredListings.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Ingen stillinger i denne kategorien"
          description="Prøv et annet filter, eller kom tilbake senere for nye stillinger."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredListings.map((listing) => (
            <Card key={listing.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{listing.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {listing.matchPercent}% match
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{listing.company}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{listing.location}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Frist: {listing.deadline}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {FILTER_LABELS[listing.type]}
                  </Badge>
                  <Badge variant="outline">
                    RIASEC: {listing.riasecMatch}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Se stilling
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Verifisert merknad */}
      <p className="text-xs text-muted-foreground text-center">
        <Building2 className="inline-block h-3.5 w-3.5 mr-1" aria-hidden="true" />
        Alle arbeidsgivere er verifisert mot Brønnøysundregistrene.
      </p>
    </div>
  );
}
