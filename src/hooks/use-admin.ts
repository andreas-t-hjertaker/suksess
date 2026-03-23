"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

export function useAdmin() {
  const { firebaseUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    firebaseUser.getIdTokenResult().then((result) => {
      setIsAdmin(!!result.claims.admin);
      setLoading(false);
    }).catch(() => {
      setIsAdmin(false);
      setLoading(false);
    });
  }, [firebaseUser]);

  return { isAdmin, loading };
}
