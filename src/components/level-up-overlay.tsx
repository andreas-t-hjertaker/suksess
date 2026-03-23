"use client";

/**
 * Level Up-overlay — animert overlay ved nivåoppgang (Issue #68)
 * Bruker Framer Motion. Respekterer prefers-reduced-motion.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useXp } from "@/hooks/use-xp";
import { LEVELS, getLevelForXp } from "@/lib/gamification/xp";

const LEVEL_ICONS: Record<string, string> = {
  nybegynner: "🌱",
  utforsker:  "🗺️",
  veiviser:   "🧭",
  mester:     "⭐",
};

const LEVEL_COLORS: Record<string, string> = {
  nybegynner: "from-slate-500 to-slate-700",
  utforsker:  "from-blue-500 to-blue-700",
  veiviser:   "from-violet-500 to-violet-700",
  mester:     "from-amber-400 to-amber-600",
};

export function LevelUpOverlay() {
  const { totalXp } = useXp();
  const [prevLevel, setPrevLevel] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const currentLevelName = getLevelForXp(totalXp).name;

    if (prevLevel !== null && prevLevel !== currentLevelName) {
      const levelDef = LEVELS.find((l) => l.name === currentLevelName);
      if (levelDef) {
        setNewLevel(currentLevelName);
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 3500);
        return () => clearTimeout(t);
      }
    }

    setPrevLevel(currentLevelName);
  }, [totalXp]); // eslint-disable-line react-hooks/exhaustive-deps

  const levelDef = LEVELS.find((l) => l.name === newLevel);

  return (
    <AnimatePresence>
      {visible && levelDef && (
        <motion.div
          key="level-up"
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className={`bg-gradient-to-br ${LEVEL_COLORS[newLevel!] ?? "from-primary to-primary/70"} rounded-2xl shadow-2xl px-10 py-8 text-white text-center max-w-xs w-full`}>
            <motion.div
              initial={{ rotate: -10, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              className="text-6xl mb-3"
              aria-hidden="true"
            >
              {LEVEL_ICONS[newLevel!] ?? "🎉"}
            </motion.div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
              Nivå opp!
            </p>
            <h2 className="text-2xl font-bold mb-2">{levelDef.label}</h2>
            <p className="text-sm opacity-90 leading-relaxed">{levelDef.description}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
