"use client";

/**
 * Stillinger-side — Lærlingplasser, sommerjobber og trainee-stillinger (#129)
 *
 * Viser ekte stillinger fra NAV filtrert på ungdomsrelevante typer,
 * matchet mot brukerens RIASEC-profil.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useJobSearch } from "@/hooks/use-job-search";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { getRiasecCode } from "@/lib/personality/scoring";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/page-skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import {
  Briefcase,
  MapPin,
  Calendar,
  Building2,
  Filter,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Filter-typer og mapping
// ---------------------------------------------------------------------------

type FilterType = "alle" | "laerling" | "sommerjobb" | "trainee" | "deltid";

const FILTER_LABELS: Record<FilterType, string> = {
  alle: "Alle",
  laerling: "Lærlingplass",
  sommerjobb: "Sommerjobb",
  trainee: "Trainee",
  deltid: "Deltid",
};

/**
 * Mapper UI-filter til searchJobs-parametere.
 * "lærling" og "deltid" kan filtreres på type.
 * "sommerjobb" og "trainee" søkes som fritekst (NAV har ikke disse som egne typer).
 */
function filterToSearchParams(filter: FilterType): { type?: string; query?: string } {
  switch (filter) {
    case "laerling": return { type: "lærling" };
    case "deltid": return { type: "deltid" };
    case "sommerjobb": return { query: "sommerjobb" };
    case "trainee": return { query: "trainee" };
    default: return {};
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StillingerPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("alle");

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserProfile(user.uid, (p) => {
      setProfile(p);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;
  const searchParams = filterToSearchParams(activeFilter);

  const {
    jobs,
    loading: jobsLoading,
    loadingMore,
    error: jobsError,
    hasMore,
    loadMore,
    retry,
  } = useJobSearch({
    riasecProfile: profile?.riasec ?? null,
    type: searchParams.type,
    query: searchParams.query,
    pageSize: 20,
  });

  if (profileLoading) {
    return <PageSkeleton variant="grid" cards={4} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">
          Stillinger for deg
        </h1>
        <p className="text-muted-foreground mt-1">
          Lærlingplasser, sommerjobber og trainee-stillinger fra NAV
          {riasecCode ? ` matchet mot din profil (${riasecCode})` : ""}.
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
      {jobsLoading ? (
        <PageSkeleton variant="grid" cards={4} />
      ) : jobsError ? (
        <ErrorState message={jobsError} onRetry={retry} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Ingen stillinger i denne kategorien"
          description="Prøv et annet filter, eller kom tilbake senere for nye stillinger fra NAV."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {job.matchScore}% match
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{job.company}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{job.location}</span>
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Frist: {job.deadline}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {job.type === "lærling" ? "Lærlingplass" : job.type === "internship" ? "Internship" : job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                    </Badge>
                    {job.riasecCodes.length > 0 && (
                      <Badge variant="outline">
                        RIASEC: {job.riasecCodes.map((c) => c.charAt(0).toUpperCase()).join("")}
                      </Badge>
                    )}
                  </div>
                  {job.applicationUrl ? (
                    <Button variant="outline" size="sm" className="w-full gap-1.5" render={<a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" />}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Se stilling
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full gap-1.5" render={<a href="https://arbeidsplassen.nav.no" target="_blank" rel="noopener noreferrer" />}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      NAV Arbeidsplassen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Last inn flere */}
          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Laster…</>
                ) : (
                  "Last inn flere stillinger"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Verifisert merknad */}
      <p className="text-xs text-muted-foreground text-center">
        <Building2 className="inline-block h-3.5 w-3.5 mr-1" aria-hidden="true" />
        Stillingsdata hentet fra NAV Arbeidsplassen (oppdateres daglig).
      </p>
    </div>
  );
}
