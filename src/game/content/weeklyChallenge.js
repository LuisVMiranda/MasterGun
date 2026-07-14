import { WEAPON_DEFINITIONS } from "./weapons.js";

export const WEEKLY_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ id: "easy", duration: 210, modifierCount: 2, rewardMultiplier: 1, profileLevel: 50 }),
  medium: Object.freeze({ id: "medium", duration: 225, modifierCount: 3, rewardMultiplier: 1.6, profileLevel: 100 }),
  hard: Object.freeze({ id: "hard", duration: 240, modifierCount: 4, rewardMultiplier: 2.4, profileLevel: 150 }),
});

const MODIFIERS = Object.freeze(["thinProjectile", "forceReload", "forceSoldierReload", "noAmmoConsumption", "specialShot", "shieldPressure"]);
const OBJECTIVES = Object.freeze(["accuracy", "pickups", "collisions", "life"]);

export function getUtcWeekKey(now = Date.now()) {
  const date = new Date(now);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getNextWeekUtc(now = Date.now()) {
  const date = new Date(now);
  const day = date.getUTCDay() || 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + (8 - day));
}

export function getTrustedWeeklyNow(progress, now = Date.now()) {
  return Math.max(Number(now) || 0, Number(progress?.lastSeenUtc) || 0);
}

export function createWeeklyChallenge(difficultyId, highestArcadeClear, now = Date.now()) {
  const difficulty = WEEKLY_DIFFICULTIES[difficultyId] ?? WEEKLY_DIFFICULTIES.easy;
  const weekKey = getUtcWeekKey(now);
  const seed = hashWeek(weekKey);
  const weapon = WEAPON_DEFINITIONS[seed % WEAPON_DEFINITIONS.length];
  const modifiers = pickRotating(MODIFIERS, seed >>> 3, difficulty.modifierCount);
  const objective = OBJECTIVES[(seed >>> 7) % OBJECTIVES.length];
  const baseReward = Math.round((6000 + 75 * Math.min(200, highestArcadeClear)) / 100) * 100;
  return Object.freeze({
    id: `${weekKey}-${difficulty.id}`,
    weekKey,
    seed,
    difficulty,
    weaponId: weapon.id,
    modifiers,
    objective,
    cashTarget: Math.round((900 + highestArcadeClear * 12) * difficulty.rewardMultiplier),
    reward: Math.round(baseReward * difficulty.rewardMultiplier),
  });
}

export function isWeeklyObjectiveComplete(run) {
  const challenge = run.modeContext.challenge;
  const metrics = run.metrics ?? {};
  if ((metrics.cashValue ?? 0) < challenge.cashTarget) return false;
  if (challenge.objective === "accuracy") return getAccuracy(metrics) >= 0.42;
  if (challenge.objective === "pickups") return (metrics.pickupsShot ?? 0) >= 5;
  if (challenge.objective === "collisions") return (metrics.collisions ?? 0) <= 5;
  return run.player.life / Math.max(1, run.player.maxLife) >= 0.25;
}

function getAccuracy(metrics) {
  return (metrics.projectileHits ?? 0) / Math.max(1, metrics.shotsFired ?? 0);
}

function pickRotating(values, seed, count) {
  const output = [...values];
  let state = seed >>> 0;
  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output.slice(0, count);
}

function hashWeek(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
