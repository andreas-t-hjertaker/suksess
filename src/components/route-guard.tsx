"use client";

/**
 * Klient-side rutebeskyttelse (#139).
 *
 * Bruker konfigurasjonen fra route-guard.ts for å:
 * - Redirecte uinnloggede brukere bort fra beskyttede ruter
 * - Redirecte innloggede brukere bort fra gjest-ruter (/login)
 * - Sjekke roller (admin, counselor) for admin-ruter
 *
 * NB: Dette er "defense in depth" — server-side sikkerhet (Firebase Rules,
 * Cloud Functions middleware) er den egentlige beskyttelsen.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getRedirectUrl, isProtectedRoute } from "@/lib/route-guard";
import { PageSkeleton } from "@/components/page-skeleton";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    async function checkAccess() {
      let isAdmin = false;
      let isCounselor = false;

      if (firebaseUser) {
        try {
          const result = await firebaseUser.getIdTokenResult();
          isAdmin = !!result.claims.admin;
          isCounselor = result.claims.role === "counselor";
        } catch {
          // Token-feil — brukeren er innlogget men claims utilgjengelige
        }
      }

      const userRoles = {
        authenticated: !!firebaseUser,
        admin: isAdmin,
        counselor: isCounselor,
      };

      const redirectUrl = getRedirectUrl(pathname, userRoles);
      if (redirectUrl) {
        router.replace(redirectUrl);
      } else {
        setChecked(true);
      }
    }

    checkAccess();
  }, [firebaseUser, authLoading, pathname, router]);

  // Vis skeleton mens vi sjekker tilgang på beskyttede ruter
  if (!checked && isProtectedRoute(pathname)) {
    return <PageSkeleton variant="grid" cards={4} />;
  }

  return <>{children}</>;
}
