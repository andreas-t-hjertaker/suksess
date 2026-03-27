/**
 * Ukentlige oppdrag (Quests) — personaliserte karriereutforskings-oppdrag.
 * Roterer ukentlig basert på ISO-uke. Personalisering via RIASEC-kode.
 * Issue #68
 */

export type QuestId = string;

export type Quest = {
  id: QuestId;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  icon: string;
  /** RIASEC-koder dette oppdraget er relevant for (tom = alle) */
  riasecRelevance: string[];
};

const ALL_QUESTS: Quest[] = [
  {
    id: "explore_careers_3",
    title: "Utforsker",
    description: "Utforsk 3 karriereveier denne uken",
    target: 3,
    xpReward: 20,
    icon: "🔍",
    riasecRelevance: [],
  },
  {
    id: "ai_chat_2",
    title: "Nysgjerrig samtale",
    description: "Ha 2 samtaler med AI-veilederen",
    target: 2,
    xpReward: 15,
    icon: "💬",
    riasecRelevance: [],
  },
  {
    id: "explore_health",
    title: "Helsesektor",
    description: "Utforsk 3 yrker innen helse",
    target: 3,
    xpReward: 20,
    icon: "🏥",
    riasecRelevance: ["S", "I"],
  },
  {
    id: "explore_tech",
    title: "Teknologiverden",
    description: "Utforsk 3 yrker innen teknologi",
    target: 3,
    xpReward: 20,
    icon: "💻",
    riasecRelevance: ["R", "I"],
  },
  {
    id: "explore_creative",
    title: "Kreativ utforsking",
    description: "Utforsk 3 yrker innen kreative næringer",
    target: 3,
    xpReward: 20,
    icon: "🎨",
    riasecRelevance: ["A"],
  },
  {
    id: "set_career_goal",
    title: "Målbevisst",
    description: "Sett et karrieremål for fremtiden",
    target: 1,
    xpReward: 25,
    icon: "🎯",
    riasecRelevance: [],
  },
  {
    id: "read_new_education",
    title: "Åpent sinn",
    description: "Les om en utdanning du aldri har vurdert",
    target: 1,
    xpReward: 15,
    icon: "📖",
    riasecRelevance: [],
  },
  {
    id: "explore_enterprise",
    title: "Gründer-DNA",
    description: "Utforsk 3 yrker innen ledelse og business",
    target: 3,
    xpReward: 20,
    icon: "📊",
    riasecRelevance: ["E", "C"],
  },
  {
    id: "complete_daily_5",
    title: "Dedikert",
    description: "Logg inn 5 dager denne uken",
    target: 5,
    xpReward: 30,
    icon: "📅",
    riasecRelevance: [],
  },
  {
    id: "chat_about_riasec",
    title: "Selvrefleksjon",
    description: "Spør AI-veilederen om ditt RIASEC-resultat",
    target: 1,
    xpReward: 15,
    icon: "🧠",
    riasecRelevance: [],
  },
];

/**
 * Velg 3 oppdrag for denne uken basert på ISO-uke og RIASEC-kode.
 * Deterministisk — samme uke gir samme oppdrag for samme bruker.
 */
export function getWeeklyQuests(riasecCode: string | null, weekOffset = 0): Quest[] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const isoWeek = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7) + weekOffset;

  // Filtrer relevante quests — universelle + RIASEC-matchende
  const topCode = riasecCode?.charAt(0) ?? "";
  const relevant = ALL_QUESTS.filter(
    (q) => q.riasecRelevance.length === 0 || q.riasecRelevance.includes(topCode)
  );

  // Deterministisk shuffle basert på uke
  const shuffled = [...relevant].sort((a, b) => {
    const hashA = simpleHash(`${isoWeek}-${a.id}`);
    const hashB = simpleHash(`${isoWeek}-${b.id}`);
    return hashA - hashB;
  });

  return shuffled.slice(0, 3);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
