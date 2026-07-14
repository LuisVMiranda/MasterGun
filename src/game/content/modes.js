export const GAME_MODE = Object.freeze({
  ARCADE: "arcade",
  WEEKLY: "weekly",
  WEAPON_MASTERY: "weaponMastery",
  BOSS_RUSH: "bossRush",
  ENDLESS: "endless",
});

export const MODE_DEFINITIONS = Object.freeze([
  mode(GAME_MODE.ARCADE, 0, "arcade"),
  mode(GAME_MODE.WEEKLY, 25, "weekly"),
  mode(GAME_MODE.WEAPON_MASTERY, 50, "weaponMastery"),
  mode(GAME_MODE.BOSS_RUSH, 100, "bossRush"),
  mode(GAME_MODE.ENDLESS, 200, "endless"),
]);

export function findMode(modeId) {
  return MODE_DEFINITIONS.find((definition) => definition.id === modeId) ?? MODE_DEFINITIONS[0];
}

export function getHighestArcadeClear(save) {
  const recorded = Number(save.modeProgress?.arcade?.highestCleared);
  if (Number.isFinite(recorded)) return clampClear(recorded);
  return clampClear((Number(save.level) || 1) - 1);
}

export function isModeUnlocked(save, modeId) {
  return getHighestArcadeClear(save) >= findMode(modeId).unlockLevel;
}

function mode(id, unlockLevel, image) {
  return {
    id,
    unlockLevel,
    image: `/assets/modes/${image}.jpg`,
    titleKey: `mode.${id}.title`,
    descriptionKey: `mode.${id}.description`,
  };
}

function clampClear(value) {
  return Math.min(200, Math.max(0, Math.floor(value)));
}
