import { WEAPON_DEFINITIONS } from "../content/weapons.js";
import { getTrustedWeeklyNow, getUtcWeekKey } from "../content/weeklyChallenge.js";

export function createModeProgress() {
  return {
    arcade: { highestCleared: 0, championSeen: false },
    mastery: createMasteryProgress(),
    bossRush: { medals: {}, bestScores: {}, crownSeen: false },
    weekly: createWeeklyProgress(),
    endless: { bestSector: 0, bestScore: 0, largestExtraction: 0, extractions: 0, activeOperation: null },
    victories: { arcadeChampion: false, masteryCrown: false, bossRushCrown: false, legend: false, seen: [] },
  };
}

export function normalizeModeProgress(value, level = 1, now = Date.now()) {
  const fallback = createModeProgress();
  const source = asObject(value);

  return {
    arcade: normalizeArcade(source.arcade, fallback.arcade, level),
    mastery: normalizeMastery(source.mastery, fallback.mastery),
    bossRush: normalizeMedalProgress(source.bossRush, fallback.bossRush),
    weekly: normalizeWeekly(source.weekly, fallback.weekly, now),
    endless: { ...fallback.endless, ...source.endless },
    victories: normalizeVictories(source.victories, fallback.victories),
  };
}

function normalizeArcade(value, fallback, level) {
  const migratedClear = normalizeClear((Number(level) || 1) - 1);
  const current = asObject(value);
  return { ...fallback, ...current, highestCleared: Math.max(migratedClear, normalizeClear(current.highestCleared)) };
}

function normalizeMedalProgress(value, fallback) {
  const current = asObject(value);
  return { ...fallback, ...current, medals: { ...asObject(current.medals) }, bestScores: { ...asObject(current.bestScores) } };
}

function normalizeVictories(value, fallback) {
  const current = asObject(value);
  return { ...fallback, ...current, seen: Array.isArray(current.seen) ? [...current.seen] : [] };
}

export function recordArcadeClear(save, level) {
  const modeProgress = normalizeModeProgress(save.modeProgress, save.level);
  const highestCleared = Math.max(modeProgress.arcade.highestCleared, Math.min(200, Math.max(0, Math.floor(level))));
  return {
    ...save,
    modeProgress: {
      ...modeProgress,
      arcade: { ...modeProgress.arcade, highestCleared },
      victories: { ...modeProgress.victories },
    },
  };
}

function createMasteryProgress() {
  return Object.fromEntries(WEAPON_DEFINITIONS.map((weapon) => [weapon.id, { medals: {}, bestScores: {}, crownSeen: false }]));
}

function createWeeklyProgress() {
  return { weekKey: null, attemptsUsed: 0, completed: false, rewardClaimed: false, difficulty: null, activeAttempt: null, lastSeenUtc: 0 };
}

function normalizeMastery(value, fallback) {
  return Object.fromEntries(Object.entries(fallback).map(([weaponId, initial]) => {
    const current = value?.[weaponId] ?? {};
    return [weaponId, { ...initial, ...current, medals: { ...(current.medals ?? {}) }, bestScores: { ...(current.bestScores ?? {}) } }];
  }));
}

function normalizeWeekly(value, fallback, now) {
  const current = { ...fallback, ...(value ?? {}) };
  const trustedNow = getTrustedWeeklyNow(current, now);
  const weekKey = getUtcWeekKey(trustedNow);
  const weekly = current.weekKey === weekKey ? current : { ...fallback, weekKey };
  return { ...weekly, activeAttempt: null, lastSeenUtc: trustedNow };
}

function normalizeClear(value) {
  return Number.isFinite(Number(value)) ? Math.min(200, Math.max(0, Math.floor(value))) : 0;
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}
