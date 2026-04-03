/**
 * Rutebeskyttelse — konfigurasjonsbasert klient-side ruteautentisering (#139)
 *
 * Siden prosjektet bruker `output: "export"` (statisk eksport til Firebase Hosting),
 * kan ikke Next.js server-side middleware brukes. All rutebeskyttelse skjer derfor
 * klient-side som "defense in depth" sammen med:
 * - Firebase Security Rules (Firestore, Storage)
 * - Cloud Functions withAuth/withAdmin middleware
 * - CSRF-token validering
 * - Security headers i firebase.json
 *
 * Denne modulen definerer:
 * 1. Hvilke ruter som er beskyttet og med hvilke roller
 * 2. Redirect-regler for innloggede/uinnloggede brukere
 * 3. Hjelpefunksjoner for å sjekke tilgang
 */

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

export type RouteRole = "authenticated" | "admin" | "counselor";

export interface RouteConfig {
  /** Rute-mønster (starter med /) */
  pattern: string;
  /** Påkrevd rolle for tilgang */
  requiredRole: RouteRole;
  /** Redirect-mål ved manglende tilgang */
  redirectTo: string;
  /** Inkluder callbackUrl i redirect */
  includeCallback: boolean;
}

// ---------------------------------------------------------------------------
// Rutekonfigurasjon
// ---------------------------------------------------------------------------

export const PROTECTED_ROUTES: RouteConfig[] = [
  // Dashboard — krever innlogging
  {
    pattern: "/dashboard",
    requiredRole: "authenticated",
    redirectTo: "/login",
    includeCallback: true,
  },
  // Admin — krever admin-rolle
  {
    pattern: "/admin",
    requiredRole: "admin",
    redirectTo: "/dashboard",
    includeCallback: false,
  },
  // Onboarding — krever innlogging
  {
    pattern: "/onboarding",
    requiredRole: "authenticated",
    redirectTo: "/login",
    includeCallback: true,
  },
  // School-admin — krever admin-rolle
  {
    pattern: "/school-admin",
    requiredRole: "admin",
    redirectTo: "/dashboard",
    includeCallback: false,
  },
];

/** Ruter som innloggede brukere skal redirectes bort fra */
export const GUEST_ONLY_ROUTES = ["/login"];

/** Offentlige ruter som aldri krever autentisering */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/legal",
  "/personvern",
  "/pricing",
  "/status",
  "/samtykke-bekreftelse",
];

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

/**
 * Finn rutekonfigurasjon for en gitt sti.
 * Matcher på prefix — /dashboard/profil matcher /dashboard.
 */
export function getRouteConfig(pathname: string): RouteConfig | null {
  return (
    PROTECTED_ROUTES.find((route) => pathname.startsWith(route.pattern)) ?? null
  );
}

/**
 * Sjekk om en rute er beskyttet (krever innlogging).
 */
export function isProtectedRoute(pathname: string): boolean {
  return getRouteConfig(pathname) !== null;
}

/**
 * Sjekk om en rute kun er for gjester (uinnloggede).
 */
export function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Sjekk om en bruker har riktig rolle for en rute.
 */
export function hasRequiredRole(
  role: RouteRole,
  userRoles: { authenticated: boolean; admin: boolean; counselor: boolean }
): boolean {
  switch (role) {
    case "authenticated":
      return userRoles.authenticated;
    case "admin":
      return userRoles.admin;
    case "counselor":
      return userRoles.counselor;
    default:
      return false;
  }
}

/**
 * Bygg redirect-URL for en beskyttet rute.
 */
export function buildRedirectUrl(
  config: RouteConfig,
  currentPath: string
): string {
  if (config.includeCallback) {
    const callbackUrl = encodeURIComponent(currentPath);
    return `${config.redirectTo}?callbackUrl=${callbackUrl}`;
  }
  return config.redirectTo;
}

/**
 * Bestem redirect-URL basert på autentiseringsstatus og nåværende rute.
 * Returnerer null hvis ingen redirect er nødvendig.
 */
export function getRedirectUrl(
  pathname: string,
  userRoles: { authenticated: boolean; admin: boolean; counselor: boolean }
): string | null {
  // Innlogget bruker på gjest-rute → redirect til dashboard
  if (userRoles.authenticated && isGuestOnlyRoute(pathname)) {
    return "/dashboard";
  }

  // Sjekk beskyttet rute
  const config = getRouteConfig(pathname);
  if (!config) return null; // Offentlig rute

  // Ikke innlogget → redirect til login
  if (!userRoles.authenticated) {
    return buildRedirectUrl(config, pathname);
  }

  // Innlogget men mangler rolle → redirect
  if (!hasRequiredRole(config.requiredRole, userRoles)) {
    return config.redirectTo;
  }

  return null; // Ingen redirect nødvendig
}
