import { GAME_MODE, getHighestArcadeClear } from "../content/modes.js";
import { createEndlessOperation } from "../content/endless.js";
import { createWeeklyChallenge } from "../content/weeklyChallenge.js";
import { normalizeModeProgress } from "./modeProgress.js";
import { createBossRushModePlan, createEndlessModePlan, createMasteryModePlan, createWeeklyModePlan } from "./modePlans.js";
import { createRoundPlan } from "./roundGenerator.js";
import { buildStats } from "./stats.js";
import { findMasteryTrial, isMasteryTrialUnlocked } from "../content/masteryTrials.js";
import { findBossFight, isBossFightUnlocked } from "../content/bossRush.js";

export function createModeRunSetup(state, seed, locale, now = Date.now()) {
  const mode = state.selectedMode ?? GAME_MODE.ARCADE;
  if (mode === GAME_MODE.WEEKLY) return createWeeklySetup(state, seed, locale, now);
  if (mode === GAME_MODE.ENDLESS) return createEndlessSetup(state, seed, locale);

  const selection = state.modeSelection;
  if (!isSelectionPlayable(state, mode, selection)) return null;
  const weaponId = mode === GAME_MODE.WEAPON_MASTERY ? selection.masteryWeapon : state.save.equippedWeapon;
  const fullStats = buildStats(state.save.upgrades, {}, weaponId);
  const stats = normalizeModeStats(mode, fullStats, weaponId);
  const details = { seed, locale, stats, weaponId, highestArcadeClear: getHighestArcadeClear(state.save), now };
  const plan = getPlan(mode, selection, details, state.save.level);
  return { mode, plan, stats, weaponId: plan.weaponId ?? weaponId, save: state.save };
}

function isSelectionPlayable(state, mode, selection) {
  if (mode === GAME_MODE.WEAPON_MASTERY) {
    if (!state.save.weaponsOwned.includes(selection.masteryWeapon)) return false;
    const trial = findMasteryTrial(selection.masteryWeapon, selection.masteryTrial);
    return isMasteryTrialUnlocked(state.save.modeProgress.mastery[selection.masteryWeapon], trial);
  }
  if (mode === GAME_MODE.BOSS_RUSH) return isBossFightUnlocked(state.save.modeProgress.bossRush, findBossFight(selection.bossFight));
  return true;
}

export function normalizeModeStats(mode, fullStats, weaponId) {
  if ([GAME_MODE.ARCADE, GAME_MODE.ENDLESS].includes(mode)) return fullStats;
  const baseline = buildStats({}, {}, weaponId);
  if (mode === GAME_MODE.WEEKLY) return baseline;
  const cap = mode === GAME_MODE.WEAPON_MASTERY ? 1.15 : 1.2;
  return Object.fromEntries(Object.entries(fullStats).map(([key, value]) => {
    if (typeof value !== "number" || typeof baseline[key] !== "number") return [key, value];
    return [key, Math.min(value, baseline[key] * cap)];
  }));
}

function createWeeklySetup(state, seed, locale, now) {
  const selection = state.modeSelection;
  const challenge = createWeeklyChallenge(selection.weeklyDifficulty, getHighestArcadeClear(state.save), now);
  const save = spendWeeklyAttempt(state.save, challenge, now);
  if (!save) return null;
  const stats = tuneWeeklyStats(buildStats({}, {}, challenge.weaponId), challenge.difficulty.id);
  const plan = createWeeklyModePlan(selection, { seed, locale, stats, weaponId: challenge.weaponId, highestArcadeClear: getHighestArcadeClear(save), now });
  return { mode: GAME_MODE.WEEKLY, plan, stats, weaponId: challenge.weaponId, save };
}

export function tuneWeeklyStats(stats, difficulty) {
  const powerScale = { easy: 2.1, medium: 2.25, hard: 2.4 }[difficulty] ?? 2.1;
  return {
    ...stats,
    power: stats.power * powerScale,
    range: stats.range * 1.12,
    wallDamageMultiplier: 1.55,
    shieldDamageMultiplier: 1.4,
  };
}

function createEndlessSetup(state, seed, locale) {
  const modeProgress = normalizeModeProgress(state.save.modeProgress, state.save.level);
  const operation = modeProgress.endless.activeOperation ?? createEndlessOperation(seed);
  const save = { ...state.save, modeProgress: { ...modeProgress, endless: { ...modeProgress.endless, activeOperation: operation } } };
  const weaponId = save.equippedWeapon;
  const stats = buildStats(save.upgrades, {}, weaponId);
  const plan = createEndlessModePlan(operation, { seed, locale, stats, weaponId });
  return { mode: GAME_MODE.ENDLESS, plan, stats, weaponId, save };
}

function spendWeeklyAttempt(save, challenge, now) {
  const modeProgress = normalizeModeProgress(save.modeProgress, save.level);
  const previous = modeProgress.weekly;
  const weekly = previous.weekKey === challenge.weekKey ? previous : { ...previous, weekKey: challenge.weekKey, attemptsUsed: 0, completed: false, rewardClaimed: false, difficulty: null, activeAttempt: null };
  if (weekly.completed || weekly.attemptsUsed >= 3) return null;
  const nextWeekly = { ...weekly, attemptsUsed: weekly.attemptsUsed + 1, difficulty: challenge.difficulty.id, activeAttempt: { id: challenge.id, startedAt: now }, lastSeenUtc: Math.max(now, weekly.lastSeenUtc ?? 0) };
  return { ...save, modeProgress: { ...modeProgress, weekly: nextWeekly } };
}

function getPlan(mode, selection, setup, arcadeLevel) {
  if (mode === GAME_MODE.WEAPON_MASTERY) return createMasteryModePlan(selection, setup);
  if (mode === GAME_MODE.BOSS_RUSH) return createBossRushModePlan(selection, setup);
  return { ...createRoundPlan(arcadeLevel, setup.seed, setup.locale, setup.weaponId, setup.stats), level: arcadeLevel, modeContext: {} };
}
