import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CvData = {
  name: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  includeGrades: boolean;
  includeStrengths: boolean;
  includeRiasec: boolean;
  includeInterests: boolean;
  extraExperience: string;
  extraEducation: string;
  languages: string;
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
// CV Preview component (print-vennlig HTML)
// ---------------------------------------------------------------------------

export function CvPreview({
  cv,
  profile,
  gradeAvg,
  topStrengths,
  riasecCode,
}: {
  cv: CvData;
  profile: UserProfile | null;
  gradeAvg: number;
  topStrengths: string[];
  riasecCode: string | null;
}) {
  return (
    <div
      id="cv-preview"
      className="bg-white text-gray-900 p-8 rounded-xl border shadow-sm font-sans text-sm leading-relaxed min-h-[29.7cm] max-w-[21cm] mx-auto"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {cv.name || "Ditt navn"}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
          {cv.email && (
            <span>✉ {cv.email}</span>
          )}
          {cv.phone && (
            <span>☎ {cv.phone}</span>
          )}
          {cv.location && (
            <span>📍 {cv.location}</span>
          )}
          {cv.website && (
            <span>🌐 {cv.website}</span>
          )}
        </div>
      </div>

      {/* Sammendrag */}
      {cv.summary && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Profil</h2>
          <p className="text-gray-800 leading-relaxed">{cv.summary}</p>
        </section>
      )}

      {/* Styrker */}
      {cv.includeStrengths && topStrengths.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Styrker</h2>
          <div className="flex flex-wrap gap-2">
            {topStrengths.map((s) => (
              <span
                key={s}
                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700"
              >
                {STRENGTH_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Interesser fra profil */}
      {cv.includeInterests && profile?.interests && profile.interests.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Interesser</h2>
          <p className="text-gray-800">{profile.interests.join(" · ")}</p>
        </section>
      )}

      {/* RIASEC */}
      {cv.includeRiasec && riasecCode && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Interesseprofil</h2>
          <p className="text-gray-800">RIASEC-kode: <strong>{riasecCode}</strong></p>
        </section>
      )}

      {/* Utdanning */}
      <section className="mb-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Utdanning</h2>
        {cv.includeGrades && gradeAvg > 0 && (
          <div className="mb-2">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold text-gray-900">Videregående skole</p>
              <p className="text-xs text-gray-500">Pågående</p>
            </div>
            <p className="text-gray-700">
              Karaktersnitt: <strong>{gradeAvg.toFixed(2)}</strong>
            </p>
          </div>
        )}
        {cv.extraEducation && (
          <div className="whitespace-pre-line text-gray-800 mt-2">{cv.extraEducation}</div>
        )}
      </section>

      {/* Erfaring */}
      {cv.extraExperience && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Erfaring</h2>
          <div className="whitespace-pre-line text-gray-800">{cv.extraExperience}</div>
        </section>
      )}

      {/* Språk */}
      {cv.languages && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Språk</h2>
          <p className="text-gray-800">{cv.languages}</p>
        </section>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200 text-[10px] text-gray-400 text-center">
        Generert med Suksess-plattformen
      </div>
    </div>
  );
}
