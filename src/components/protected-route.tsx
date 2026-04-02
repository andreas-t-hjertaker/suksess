"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * Wrapper som krever innlogging — omdirigerer til /login med callbackUrl
 * slik at brukeren sendes tilbake etter innlogging.
 *
 * Støtter også rollebasert tilgang via requiredRole prop.
 */
export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin" | "counselor";
}) {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect til login med callbackUrl for retur etter innlogging
      const callbackUrl = encodeURIComponent(pathname);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
      return;
    }

    // Rollebasert sjekk (for admin/counselor-sider)
    if (requiredRole && firebaseUser) {
      firebaseUser.getIdTokenResult().then((result) => {
        if (!result.claims[requiredRole]) {
          router.replace("/dashboard");
        }
      });
    }
  }, [user, firebaseUser, loading, router, pathname, requiredRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
