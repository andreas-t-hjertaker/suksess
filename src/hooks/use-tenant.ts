"use client";

/**
 * useTenant — leser tenantId fra brukerens Firebase custom claims
 * og eksponerer tenant-kontekst for multi-tenant isolasjon (issue #24).
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export type TenantRole = "student" | "counselor" | "admin" | "superadmin";

export type TenantContext = {
  tenantId: string | null;
  role: TenantRole;
  loading: boolean;
  /** Om brukeren har tilgang til en gitt ressurs innen sin tenant */
  canAccess: (resource: "profiles" | "grades" | "analytics" | "admin") => boolean;
};

export function useTenant(): TenantContext {
  const { firebaseUser } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<TenantRole>("student");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setTenantId(null);
      setRole("student");
      setLoading(false);
      return;
    }

    firebaseUser.getIdTokenResult().then((result) => {
      setTenantId((result.claims.tenantId as string) ?? null);
      setRole((result.claims.role as TenantRole) ?? "student");
      setLoading(false);
    });
  }, [firebaseUser]);

  function canAccess(resource: "profiles" | "grades" | "analytics" | "admin"): boolean {
    switch (resource) {
      case "profiles":
        return true; // Alle roller kan lese sin egen profil
      case "grades":
        return true; // Alle roller kan lese egne karakterer
      case "analytics":
        return role === "counselor" || role === "admin" || role === "superadmin";
      case "admin":
        return role === "admin" || role === "superadmin";
    }
  }

  return { tenantId, role, loading, canAccess };
}
