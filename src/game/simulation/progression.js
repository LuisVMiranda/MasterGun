import { getProfileForLevel } from "../content/levelProfiles.js";

export function getProgressionBand(level) {
  if (level >= 21) return "late";
  if (level >= 9) return "mid";
  return "early";
}

export function getLevelProfile(level) {
  const profile = getProfileForLevel(level);
  const band = getProgressionBand(level);
  const challenge = level % 5 === 0;

  return {
    ...profile,
    level,
    band,
    challenge,
    speed: challenge ? Number((profile.speed * 0.78).toFixed(2)) : profile.speed,
    trackLength: challenge ? profile.trackLength + 28 : profile.trackLength,
  };
}

export function getNextUnlock(level, locale = "en") {
  const unlocks = [
    { level: 2, key: "unlock.power" },
    { level: 3, key: "unlock.income" },
    { level: 4, key: "unlock.double" },
    { level: 5, key: "unlock.assistants" },
    { level: 7, key: "unlock.solid" },
    { level: 9, key: "unlock.shooters" },
    { level: 12, key: "unlock.barricades" },
    { level: 13, key: "unlock.walkers" },
    { level: 16, key: "unlock.late" },
    { level: 21, key: "unlock.siege" },
    { level: 30, key: "unlock.crown" },
  ];
  const unlock = unlocks.find((item) => item.level > level) ?? { level: level + 5, key: "unlock.cash" };

  return { level: unlock.level, labelKey: unlock.key, label: unlock.key, locale };
}

export function getBuildRating(stats) {
  const damage = stats.fireRate * stats.power * stats.projectileCount;
  const support = stats.assistants * stats.power * 0.8;
  return Math.round(damage + support + stats.range * 0.6 + stats.ammo * 0.12);
}
