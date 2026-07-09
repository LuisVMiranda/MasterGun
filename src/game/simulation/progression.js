import { getProfileForLevel, getTargetDurationSeconds } from "../content/levelProfiles.js";

export function getProgressionBand(level) {
  if (level >= 151) return "elite";
  if (level >= 81) return "late";
  if (level >= 21) return "mid";
  return "early";
}

export function getLevelProfile(level) {
  const profile = getProfileForLevel(level);
  const band = getProgressionBand(level);
  const challenge = level % 5 === 0;
  const speed = challenge ? Number((profile.speed * 0.78).toFixed(2)) : profile.speed;
  const targetDuration = getTargetDurationSeconds(level);

  return {
    ...profile,
    level,
    band,
    challenge,
    speed,
    targetDuration,
    trackLength: Math.round(speed * targetDuration),
  };
}

export function getNextUnlock(level, locale = "en") {
  const unlocks = [
    { level: 2, key: "unlock.baseLife" },
    { level: 4, key: "unlock.power" },
    { level: 6, key: "unlock.income" },
    { level: 7, key: "unlock.solid" },
    { level: 8, key: "unlock.wallDamage" },
    { level: 9, key: "unlock.double" },
    { level: 9, key: "unlock.shooters" },
    { level: 12, key: "unlock.assistants" },
    { level: 12, key: "unlock.assistantAmmo" },
    { level: 12, key: "unlock.barricades" },
    { level: 13, key: "unlock.walkers" },
    { level: 16, key: "unlock.late" },
    { level: 18, key: "unlock.breachDamage" },
    { level: 21, key: "unlock.siege" },
    { level: 30, key: "unlock.crown" },
    { level: 35, key: "unlock.shieldDamage" },
  ];
  const unlock = unlocks.find((item) => item.level > level) ?? { level: level + 5, key: "unlock.cash" };

  return { level: unlock.level, labelKey: unlock.key, label: unlock.key, locale };
}

export function getBuildRating(stats) {
  const damage = stats.fireRate * stats.power * stats.projectileCount;
  const support = stats.assistants * stats.power * 0.8;
  return Math.round(damage + support + stats.range * 0.6 + stats.ammo * 0.12);
}
