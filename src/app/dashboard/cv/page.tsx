"use client";

/**
 * CV-builder — generer en strukturert CV basert på brukerprofil, karakterer og styrker.
 * Støtter forhåndsvisning og nedlasting som HTML (print-vennlig).
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FeatureGate } from "@/components/feature-gate";
import { PageSkeleton } from "@/components/page-skeleton";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import { useGrades } from "@/hooks/use-grades";
import { calculateGradePoints } from "@/lib/grades/calculator";
import { getRiasecCode } from "@/lib/personality/scoring";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/types/domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  User,
  GraduationCap,
  Star,
  Briefcase,
  Pencil,
  Eye,
  RotateCcw,
  Info,
  Sparkles,
  Loader2,
} from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { CvPreview } from "@/components/cv-preview";
import type { CvData } from "@/components/cv-preview";
import { getModel } from "@/lib/firebase/ai";
import { cn } from "@/lib/utils";
import { z } from "zod";

// ---------------------------------------------------------------------------
// CV-data typer
// ---------------------------------------------------------------------------

const CvDataSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  website: z.string(),
  summary: z.string(),
  includeGrades: z.boolean(),
  includeStrengths: z.boolean(),
  includeRiasec: z.boolean(),
  includeInterests: z.boolean(),
  extraExperience: z.string(),
  extraEducation: z.string(),
  languages: z.string(),
});

const DEFAULT_CV: CvData = {
  name: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  summary: "",
  includeGrades: true,
  includeStrengths: true,
  includeRiasec: false,
  includeInterests: true,
  extraExperience: "",
  extraEducation: "",
  languages: "Norsk (morsmål), Engelsk (flytende)",
};

const STRENGTH_LABELS: Record<string, string> = {
  kreativitet: "Kreativitet",
  nysgjerrighet: "Nysgjerrighet",
  lederskap: "Lederskap",
  empati: "Empati",
  utholdenhet: "Utholdenhet",
  humor: "Humor",
  rettferdighet: "Rettferdighet",
};

// ---------------------------------------------------------------------------
// Hjelpefunksjon: print/download
// ---------------------------------------------------------------------------

function downloadCv(name: string) {
  const el = document.getElementById("cv-preview");
  if (!el) return;
  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <title>CV – ${name || "Kandidat"}</title>
  <style>
    body { margin: 0; padding: 2cm; font-family: Georgia, serif; font-size: 12pt; color: #111; }
    h1 { font-size: 20pt; margin-bottom: 4px; }
    h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin: 16px 0 6px; }
    section { margin-bottom: 16px; }
    .header { border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px; }
    .meta { font-size: 9pt; color: #555; margin-top: 6px; }
    span.tag { border: 1px solid #ccc; padding: 2px 6px; margin-right: 4px; font-size: 9pt; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${el.innerHTML}
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CV_${(name || "Kandidat").replace(/\s+/g, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function CvPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [cvLoading, setCvLoading] = useState(true);
  const [cvError, setCvError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const [cv, setCv] = useState<CvData>({
    ...DEFAULT_CV,
    name: user?.displayName ?? "",
    email: user?.email ?? "",
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Last CV-utkast fra Firestore
  useEffect(() => {
    if (!user) {
      setCvLoading(false);
      return;
    }
    const ref = doc(db, "users", user.uid, "cv", "draft");
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const result = CvDataSchema.safeParse(snap.data());
        if (result.success) {
          setCv(result.data);
        }
      } else {
        setCv((prev) => ({
          ...prev,
          name: user.displayName ?? prev.name,
          email: user.email ?? prev.email,
        }));
      }
      setCvLoading(false);
      initialLoad.current = false;
    }).catch((err) => {
      console.error("CV-lasting feilet:", err);
      setCvError("Kunne ikke laste CV-data. Prøv igjen senere.");
      setCvLoading(false);
      initialLoad.current = false;
    });
  }, [user]);

  // Lagre CV til Firestore ved endringer
  useEffect(() => {
    if (initialLoad.current || !user || cvLoading) return;
    const ref = doc(db, "users", user.uid, "cv", "draft");
    setDoc(ref, { ...cv, updatedAt: serverTimestamp() }, { merge: true });
  }, [cv, user, cvLoading]);

  useEffect(() => {
    if (!user) return;
    return subscribeToUserProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setProfileError(null);
      },
      (err) => {
        console.error("Profil-lasting feilet:", err);
        setProfileError("Kunne ikke laste profildata. CV-en kan mangle styrker og interesser.");
      }
    );
  }, [user]);

  const { grades } = useGrades();
  const gradePoints = useMemo(() => calculateGradePoints(grades), [grades]);

  const topStrengths = useMemo(() => {
    if (!profile?.strengths?.length) return [];
    return profile.strengths.slice(0, 5);
  }, [profile]);

  const riasecCode = profile?.riasec ? getRiasecCode(profile.riasec) : null;

  function set<K extends keyof CvData>(key: K, value: CvData[K]) {
    setCv((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setCv({
      ...DEFAULT_CV,
      name: user?.displayName ?? "",
      email: user?.email ?? "",
    });
  }

  async function generateAiSummary() {
    if (generatingSummary) return;
    setGeneratingSummary(true);
    try {
      const parts: string[] = [
        `Skriv et profesjonelt personlig sammendrag (3–5 setninger, norsk bokmål) til en CV for en videregåendeskole-elev.`,
        cv.name ? `Navn: ${cv.name}` : "",
        riasecCode ? `Interesseprofil (RIASEC): ${riasecCode}` : "",
        topStrengths.length > 0 ? `Styrker: ${topStrengths.map(s => STRENGTH_LABELS[s] ?? s).join(", ")}` : "",
        profile?.interests?.length ? `Interesseområder: ${profile.interests.join(", ")}` : "",
        gradePoints.average > 0 ? `Karaktersnitt: ${gradePoints.average.toFixed(2)}` : "",
        `Fokus: ambisjoner, styrker og hva kandidaten søker. Ikke bruk klisjeer. Skriv i første person.`,
      ].filter(Boolean);

      const model = getModel();
      const result = await model.generateContent(parts.join("\n"));
      const text = result.response.text().trim();
      set("summary", text);
    } catch {
      // Silently fail — bruker kan skrive manuelt
    } finally {
      setGeneratingSummary(false);
    }
  }

  if (cvLoading) {
    return <PageSkeleton variant="form" cards={5} />;
  }

  if (cvError) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <ErrorState
          message={cvError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CV-builder</h1>
          <p className="text-muted-foreground mt-1">
            Bygg en profesjonell CV basert på din profil, karakterer og styrker.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Nullstill
          </Button>
          <Button
            size="sm"
            onClick={() => downloadCv(cv.name)}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Last ned (HTML)
          </Button>
        </div>
      </div>

      {/* Profilfeil-varsel (ikke-blokkerende) */}
      {profileError && (
        <ErrorState
          message={profileError}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Tab switcher */}
      <div className="flex rounded-lg border bg-muted/30 p-1 w-fit gap-1">
        <button
          onClick={() => setTab("edit")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "edit" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          Rediger
        </button>
        <button
          onClick={() => setTab("preview")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Forhåndsvisning
        </button>
      </div>

      {tab === "edit" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Personalia */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Personalia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-name">Navn</label>
                  <Input
                    id="cv-name"
                    value={cv.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ola Nordmann"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-location">Sted</label>
                  <Input
                    id="cv-location"
                    value={cv.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Oslo"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-email">E-post</label>
                <Input
                  id="cv-email"
                  type="email"
                  value={cv.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="ola@eksempel.no"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-phone">Telefon</label>
                  <Input
                    id="cv-phone"
                    value={cv.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+47 000 00 000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-website">Nettside / LinkedIn</label>
                  <Input
                    id="cv-website"
                    value={cv.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="linkedin.com/in/ola"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sammendrag */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Personlig sammendrag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={cv.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="Beskriv deg selv kort — hvem du er, hva du er opptatt av og hva du søker. 3–5 setninger."
                rows={5}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {cv.summary.length}/500 tegn
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateAiSummary}
                  disabled={generatingSummary}
                  className="gap-1.5 text-xs h-7"
                >
                  {generatingSummary ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {generatingSummary ? "Genererer…" : "Generer med AI"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hva inkluderes fra profil */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                Inkluder fra Suksess-profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  key: "includeGrades" as const,
                  label: "Karaktersnitt",
                  desc: gradePoints.average > 0 ? `${gradePoints.average.toFixed(2)} snitt` : "Ingen karakterer registrert",
                  available: gradePoints.average > 0,
                },
                {
                  key: "includeStrengths" as const,
                  label: "Styrker",
                  desc: topStrengths.length > 0 ? topStrengths.map(s => STRENGTH_LABELS[s] ?? s).join(", ") : "Ingen styrker registrert",
                  available: topStrengths.length > 0,
                },
                {
                  key: "includeInterests" as const,
                  label: "Interesseområder",
                  desc: profile?.interests?.length ? profile.interests.slice(0, 3).join(", ") : "Ingen interesser registrert",
                  available: (profile?.interests?.length ?? 0) > 0,
                },
                {
                  key: "includeRiasec" as const,
                  label: "RIASEC-kode",
                  desc: riasecCode ? `${riasecCode} (interesseprofil)` : "Ingen RIASEC-profil",
                  available: !!riasecCode,
                },
              ].map(({ key, label, desc, available }) => (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    available ? "hover:bg-muted/40" : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={cv[key] && available}
                    disabled={!available}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Fritekst-seksjoner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Ekstra seksjoner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-experience">
                  Erfaring (deltidsjobb, frivillig, verv)
                </label>
                <Textarea
                  id="cv-experience"
                  value={cv.extraExperience}
                  onChange={(e) => set("extraExperience", e.target.value)}
                  placeholder={`Eks:\nKasserer, Rema 1000 – 2023–nå\nTrener, Hasle-Løren idrettslag – 2022–nå`}
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-education">
                  Utdanning (kurs, sertifiseringer)
                </label>
                <Textarea
                  id="cv-education"
                  value={cv.extraEducation}
                  onChange={(e) => set("extraEducation", e.target.value)}
                  placeholder={`Eks:\nVideregående, Rud VGS – 2022–nå (Studiespesialisering)`}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-languages">Språk</label>
                <Input
                  id="cv-languages"
                  value={cv.languages}
                  onChange={(e) => set("languages", e.target.value)}
                  placeholder="Norsk (morsmål), Engelsk (flytende)"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Forhåndsvisning viser hvordan CV-en vil se ut. Last ned som HTML og åpne i nettleser for å printe til PDF.
            </p>
          </div>
          <CvPreview
            cv={cv}
            profile={profile}
            gradeAvg={gradePoints.average}
            topStrengths={topStrengths}
            riasecCode={riasecCode}
          />
        </div>
      )}
    </main>
  );
}

export default function CvPageGated() {
  return (
    <FeatureGate feature="cv-builder">
      <CvPage />
    </FeatureGate>
  );
}
