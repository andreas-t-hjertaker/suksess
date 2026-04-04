"use client";

/**
 * Level Up-overlay — vises når brukeren når et nytt nivå.
 * Framer Motion-animasjon med confetti-effekt.
 * Issue #68
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useXp } from "@/hooks/use-xp";
import { getLevelForXp, type LevelDefinition } from "@/lib/gamification/xp";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LevelUpOverlay() {
  const { totalXp } = useXp();
  const [previousLevel, setPreviousLevel] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [newLevel, setNewLevel] = useState<LevelDefinition | null>(null);
  const [particleOffsets] = useState(() =>
    Array.from({ length: 8 }, () => ({ x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 }))
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setShowOverlay(false);
    // Returner fokus til elementet som var fokusert før overlay åpnet
    previousFocusRef.current?.focus();
  }, []);

  // Escape-tast lukker overlay
  useEffect(() => {
    if (!showOverlay) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showOverlay, close]);

  // Fokuser knappen ved åpning
  useEffect(() => {
    if (showOverlay) {
      setTimeout(() => buttonRef.current?.focus(), 600);
    }
  }, [showOverlay]);

  useEffect(() => {
    const currentLevel = getLevelForXp(totalXp);

    if (previousLevel && previousLevel !== currentLevel.name) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setNewLevel(currentLevel);
      setShowOverlay(true);
    }

    setPreviousLevel(currentLevel.name);
  }, [totalXp, previousLevel]);

  return (
    <AnimatePresence>
      {showOverlay && newLevel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-up-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative rounded-3xl bg-gradient-to-br from-primary/90 to-primary p-8 text-center text-primary-foreground shadow-2xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dekorative partikler */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                aria-hidden="true"
                className="absolute h-2 w-2 rounded-full bg-white/40"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 0,
                }}
                animate={{
                  x: particleOffsets[i].x,
                  y: particleOffsets[i].y,
                  opacity: 0,
                  scale: [0, 1.5, 0],
                }}
                transition={{ duration: 1.5, delay: i * 0.1 }}
                style={{ left: "50%", top: "50%" }}
              />
            ))}

            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20"
            >
              <Trophy className="h-10 w-10" />
            </motion.div>

            <motion.h2
              id="level-up-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold mb-2"
            >
              Nivå opp!
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-extrabold mb-2"
            >
              {newLevel.label}
            </motion.p>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm opacity-80 mb-6"
            >
              {newLevel.description}
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                ref={buttonRef}
                variant="secondary"
                onClick={close}
                className="rounded-full px-8"
              >
                Fantastisk!
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
