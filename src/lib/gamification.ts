export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  xpReward: number;
}

export interface OperatorProfile {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  totalCalls: number;
  successfulDeals: number;
  objectionsHandled: number;
  complianceScore: number; // 0 - 100%
  achievements: Achievement[];
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_deal",
    title: "První Zásah",
    description: "Uzavři svou první úspěšnou objednávku přes CRM.",
    icon: "🎯",
    xpReward: 100,
    unlockedAt: new Date().toISOString(),
  },
  {
    id: "objection_master",
    title: "Mistr Námitek",
    description: "Úspěšně překonej 5 zákaznických námitek v hovoru.",
    icon: "🛡️",
    xpReward: 250,
    unlockedAt: new Date().toISOString(),
  },
  {
    id: "cross_sell_king",
    title: "Cross-Sell Král",
    description: "Přidej do objednávky produkt z druhé kategorie.",
    icon: "👑",
    xpReward: 300,
  },
  {
    id: "compliance_shield",
    title: "Zákonný Štít",
    description: "Dokonči 10 hovorů s 100% dodržením legislativy.",
    icon: "⚖️",
    xpReward: 400,
  },
  {
    id: "training_champion",
    title: "Šampión Trenažéru",
    description: "Získej hodnocení A+ v AI Roleplay trenažéru.",
    icon: "🏆",
    xpReward: 500,
  },
];

const STORAGE_KEY = "countdown_crm_operator_profile_v1";

export function getOperatorProfile(): OperatorProfile {
  if (typeof window === "undefined") {
    return getDefaultProfile();
  }

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const defaultProfile = getDefaultProfile();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfile));
    return defaultProfile;
  }

  try {
    return JSON.parse(data);
  } catch {
    return getDefaultProfile();
  }
}

function getDefaultProfile(): OperatorProfile {
  return {
    level: 4,
    currentXp: 1450,
    nextLevelXp: 2000,
    totalCalls: 38,
    successfulDeals: 19,
    objectionsHandled: 12,
    complianceScore: 98,
    achievements: INITIAL_ACHIEVEMENTS,
  };
}

export function addOperatorXp(xp: number, _reason: string): { newProfile: OperatorProfile; leveledUp: boolean } {
  void _reason;
  const profile = getOperatorProfile();
  let currentXp = profile.currentXp + xp;
  let level = profile.level;
  let nextLevelXp = profile.nextLevelXp;
  let leveledUp = false;

  while (currentXp >= nextLevelXp) {
    level += 1;
    currentXp -= nextLevelXp;
    nextLevelXp = Math.floor(nextLevelXp * 1.3);
    leveledUp = true;
  }

  const updatedProfile: OperatorProfile = {
    ...profile,
    level,
    currentXp,
    nextLevelXp,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
  }

  return { newProfile: updatedProfile, leveledUp };
}

export function unlockAchievement(achievementId: string): { newProfile: OperatorProfile; newlyUnlocked?: Achievement } {
  const profile = getOperatorProfile();
  let newlyUnlocked: Achievement | undefined;

  const updatedAchievements = profile.achievements.map((ach) => {
    if (ach.id === achievementId && !ach.unlockedAt) {
      newlyUnlocked = { ...ach, unlockedAt: new Date().toISOString() };
      return newlyUnlocked;
    }
    return ach;
  });

  if (!newlyUnlocked) {
    return { newProfile: profile };
  }

  const updatedProfile: OperatorProfile = {
    ...profile,
    achievements: updatedAchievements,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
  }

  const { newProfile } = addOperatorXp(newlyUnlocked.xpReward, `Unlocked achievement: ${newlyUnlocked.title}`);
  return { newProfile, newlyUnlocked };
}
