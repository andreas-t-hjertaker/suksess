"use client";

/**
 * PersonalityProvider — leser brukerens profil fra Firestore og
 * applicerer design-tokens som CSS custom properties på <html>-elementet.
 *
 * Tema-bytte er < 50ms fordi det kun er en DOM-mutasjon.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToUserProfile } from "@/lib/firebase/profiles";
import {
  computePersonalityUI,
  DEFAULT_UI_CONFIG,
  type PersonalityUIConfig,
} from "@/lib/personality/engine";
import type { UserProfile } from "@/types/domain";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type PersonalityContextType = {
  config: PersonalityUIConfig;
  profile: UserProfile | null;
  /** Bruker kan overstyre automatisk tilpasning */
  overrideConfig: (partial: Partial<PersonalityUIConfig>) => void;
  resetOverride: () => void;
};

const PersonalityContext = createContext<PersonalityContextType>({
  config: DEFAULT_UI_CONFIG,
  profile: null,
  overrideConfig: () => {},
  resetOverride: () => {},
});

export function usePersonality() {
  return useContext(PersonalityContext);
}

// ---------------------------------------------------------------------------
// Hjelper: appliser CSS vars på <html>-elementet
// ---------------------------------------------------------------------------

function applyCssVars(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  // Fjern gammel primærfarge — personality-primary tar over via data-attr
  root.setAttribute("data-personality", "true");
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PersonalityProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [baseConfig, setBaseConfig] = useState<PersonalityUIConfig>(DEFAULT_UI_CONFIG);
  const [override, setOverride] = useState<Partial<PersonalityUIConfig>>({});

  // Abonner på profil
  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      setBaseConfig(DEFAULT_UI_CONFIG);
      return;
    }
    const unsub = subscribeToUserProfile(firebaseUser.uid, (p) => {
      setProfile(p);
      if (p) {
        setBaseConfig(computePersonalityUI(p.bigFive, p.riasec));
      }
    });
    return unsub;
  }, [firebaseUser]);

  // Appliser CSS-vars når config endres
  useEffect(() => {
    const merged = { ...baseConfig, ...override };
    const mergedVars = {
      ...baseConfig.cssVars,
      ...(override.cssVars ?? {}),
    };
    applyCssVars(mergedVars);
    // Sett data-layout-attributt for CSS-selektorer
    document.documentElement.setAttribute("data-layout", merged.layoutDensity);
    document.documentElement.setAttribute("data-animation", merged.animationIntensity);
  }, [baseConfig, override]);

  const overrideConfig = useCallback((partial: Partial<PersonalityUIConfig>) => {
    setOverride((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetOverride = useCallback(() => {
    setOverride({});
  }, []);

  const config: PersonalityUIConfig = { ...baseConfig, ...override };

  return (
    <PersonalityContext.Provider value={{ config, profile, overrideConfig, resetOverride }}>
      {children}
    </PersonalityContext.Provider>
  );
}
