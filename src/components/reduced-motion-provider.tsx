"use client";

import { MotionConfig } from "framer-motion";

/**
 * ReducedMotionProvider — respekterer brukerens prefers-reduced-motion-innstilling (#146)
 *
 * Wrapper rundt Framer Motion MotionConfig som automatisk deaktiverer
 * animasjoner for brukere som har slått på redusert bevegelse i OS/nettleser.
 *
 * WCAG 2.2 AA krav 2.3.3 (Animation from Interactions)
 */
export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
