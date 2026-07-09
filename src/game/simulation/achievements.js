import { ENTITY } from "../content/constants.js";
import { MASTER_MISSION_ID, MISSION_DEFINITIONS } from "../content/achievements.js";

export function createMissionStats() {
  return {
    runsCompleted: 0,
    cashDrops: 0,
    enemiesDestroyed: 0,
    pickupsShot: 0,
    cleanRuns: 0,
    gatesDestroyed: 0,
    wallsDestroyed: 0,
    upgradesBought: 0,
    nonPistolEquips: 0,
    pistolRuns: 0,
    shotgunRuns: 0,
    machineGunRuns: 0,
    rifleRuns: 0,
    weaponsOwned: 1,
    cashHeld: 0,
    ammoEarned: 0,
    bossKills: 0,
    bossNoProjectileRuns: 0,
    assistantUnlocked: 0,
    doubleUnlocked: 0,
    greenBuffs: 0,
    redGatesDestroyed: 0,
    finishTierBest: 0,
    levelReached: 1,
    cappedRuns: 0,
    cashDropsSingleRun: 0,
    damageDealt: 0,
    sprinterKills: 0,
    shieldKills: 0,
    bruteKills: 0,
    finishCashDrops: 0,
    completedMissions: 0,
  };
}

export function createAchievementState() {
  return { completedIds: [], gameWon: false, gameWonAt: null, gameWonSeen: false };
}

export function createRunMetrics(weaponId) {
  return {
    weaponId,
    cashDrops: 0,
    enemiesDestroyed: 0,
    pickupsShot: 0,
    collisions: 0,
    projectileHits: 0,
    gatesDestroyed: 0,
    wallsDestroyed: 0,
    ammoEarned: 0,
    bossKills: 0,
    greenBuffs: 0,
    doubleUnlocked: 0,
    redGatesDestroyed: 0,
    finishTierBest: 0,
    damageDealt: 0,
    sprinterKills: 0,
    shieldKills: 0,
    bruteKills: 0,
    finishCashDrops: 0,
  };
}

export function normalizeMissionStats(value) {
  return { ...createMissionStats(), ...(value && typeof value === "object" ? value : {}) };
}

export function normalizeAchievements(value) {
  const fallback = createAchievementState();
  if (!value || typeof value !== "object") return fallback;

  return {
    ...fallback,
    ...value,
    completedIds: Array.isArray(value.completedIds) ? value.completedIds : fallback.completedIds,
  };
}

export function recordRunMissions(save, run) {
  const metrics = run.metrics ?? createRunMetrics(run.weaponId);
  const increments = getRunIncrements(run, metrics);
  const sets = getRunSets(run, metrics);
  return applyMissionProgress(save, increments, sets);
}

export function refreshMissionProgress(save) {
  return applyMissionProgress(save);
}

export function recordWeaponEquip(save, weaponId) {
  const increments = weaponId !== "pistol" ? { nonPistolEquips: 1 } : {};
  return applyMissionProgress(save, increments);
}

export function markGameWonSeen(save) {
  return {
    ...save,
    achievements: { ...normalizeAchievements(save.achievements), gameWonSeen: true },
  };
}

export function recordDestroyedTarget(run, entity) {
  if (!run.metrics) return;

  if (entity.type === ENTITY.GATE) recordGateDestroyed(run, entity);
  if (entity.type === ENTITY.SOLID_WALL) run.metrics.wallsDestroyed += 1;
  if ([ENTITY.ENEMY, ENTITY.SHOOTER].includes(entity.type)) recordEnemyDestroyed(run, entity);
  if (entity.type === ENTITY.BOSS) run.metrics.bossKills += 1;
}

export function recordDamage(run, damage) {
  if (run.metrics) run.metrics.damageDealt += Math.max(0, Math.round(damage));
}

export function recordCashCollected(run, entity) {
  if (!run.metrics) return;
  run.metrics.cashDrops += 1;
  if (entity.sourceType === "finish") run.metrics.finishCashDrops += 1;
}

export function recordPickupShot(run) {
  if (run.metrics) run.metrics.pickupsShot += 1;
}

export function recordGreenBuff(run, stat) {
  if (!run.metrics) return;
  run.metrics.greenBuffs += 1;
  if (stat === "doubleWeapon") run.metrics.doubleUnlocked = 1;
}

export function recordAmmoEarned(run, value) {
  if (run.metrics) run.metrics.ammoEarned += value;
}

export function recordCollision(run) {
  if (run.metrics) run.metrics.collisions += 1;
}

export function recordProjectileHit(run) {
  if (run.metrics) run.metrics.projectileHits += 1;
}

export function getMissionCards(save) {
  const stats = normalizeMissionStats(save.missionStats);
  const completed = new Set(save.achievements?.completedIds ?? []);
  return MISSION_DEFINITIONS.map((mission) => ({
    ...mission,
    progress: Math.min(mission.target, getWholeProgress(stats[mission.stat])),
    completed: completed.has(mission.id),
  }));
}

export function getMissionSummary(save) {
  const completed = save.achievements?.completedIds?.length ?? 0;
  return { completed, total: MISSION_DEFINITIONS.length, gameWon: Boolean(save.achievements?.gameWon) };
}

function applyMissionProgress(save, increments = {}, sets = {}) {
  const stats = refreshDerivedStats(save, mergeStats(save.missionStats, increments, sets));
  const achievements = completeAvailableMissions(save.achievements, stats);
  return { ...save, missionStats: stats, achievements };
}

function mergeStats(current, increments, sets) {
  const stats = normalizeMissionStats(current);
  Object.entries(increments).forEach(([key, value]) => {
    stats[key] = (stats[key] ?? 0) + value;
  });
  Object.entries(sets).forEach(([key, value]) => {
    stats[key] = Math.max(stats[key] ?? 0, value);
  });
  return stats;
}

function refreshDerivedStats(save, stats) {
  const upgradeTotal = Object.values(save.upgrades ?? {}).reduce((total, value) => total + value, 0);
  stats.weaponsOwned = Math.max(stats.weaponsOwned, save.weaponsOwned?.length ?? 1);
  stats.cashHeld = Math.max(stats.cashHeld, save.cash ?? 0);
  stats.levelReached = Math.max(stats.levelReached, save.level ?? 1);
  stats.upgradesBought = Math.max(stats.upgradesBought, upgradeTotal);
  stats.assistantUnlocked = Math.max(stats.assistantUnlocked, Number((save.upgrades?.assistants ?? 0) > 0));
  return stats;
}

function completeAvailableMissions(current, stats) {
  const achievements = normalizeAchievements(current);
  const completed = new Set(achievements.completedIds);

  MISSION_DEFINITIONS.filter(isRegularMission).forEach((mission) => {
    if ((stats[mission.stat] ?? 0) >= mission.target) completed.add(mission.id);
  });

  stats.completedMissions = completed.size;
  MISSION_DEFINITIONS.filter(isCompletedCountMission).forEach((mission) => {
    if (completed.size >= mission.target) completed.add(mission.id);
  });

  stats.completedMissions = completed.size;
  if (stats.completedMissions >= MISSION_DEFINITIONS.length - 1) completed.add(MASTER_MISSION_ID);

  return getCompletedAchievementState(achievements, completed);
}

function isRegularMission(mission) {
  return mission.id !== MASTER_MISSION_ID && mission.stat !== "completedMissions";
}

function isCompletedCountMission(mission) {
  return mission.id !== MASTER_MISSION_ID && mission.stat === "completedMissions";
}

function getCompletedAchievementState(achievements, completed) {
  const gameWon = completed.has(MASTER_MISSION_ID);
  return {
    ...achievements,
    completedIds: [...completed],
    gameWon,
    gameWonAt: gameWon ? achievements.gameWonAt ?? Date.now() : null,
  };
}

function getRunIncrements(run, metrics) {
  return {
    runsCompleted: 1,
    cashDrops: metrics.cashDrops,
    enemiesDestroyed: metrics.enemiesDestroyed,
    pickupsShot: metrics.pickupsShot,
    cleanRuns: metrics.collisions === 0 ? 1 : 0,
    gatesDestroyed: metrics.gatesDestroyed,
    wallsDestroyed: metrics.wallsDestroyed,
    ammoEarned: metrics.ammoEarned,
    bossKills: metrics.bossKills,
    bossNoProjectileRuns: run.profile.challenge && metrics.projectileHits === 0 ? 1 : 0,
    greenBuffs: metrics.greenBuffs,
    doubleUnlocked: metrics.doubleUnlocked,
    redGatesDestroyed: metrics.redGatesDestroyed,
    cappedRuns: run.profile.targetDuration >= 120 ? 1 : 0,
    damageDealt: metrics.damageDealt,
    sprinterKills: metrics.sprinterKills,
    shieldKills: metrics.shieldKills,
    bruteKills: metrics.bruteKills,
    finishCashDrops: metrics.finishCashDrops,
    [`${metrics.weaponId}Runs`]: 1,
  };
}

function getRunSets(run, metrics) {
  return {
    finishTierBest: Math.max(run.finishTier, metrics.finishTierBest),
    cashDropsSingleRun: metrics.cashDrops,
  };
}

function recordGateDestroyed(run, entity) {
  run.metrics.gatesDestroyed += 1;
  if (entity.gateType === "debuff") run.metrics.redGatesDestroyed += 1;
}

function recordEnemyDestroyed(run, entity) {
  run.metrics.enemiesDestroyed += 1;
  if (entity.enemyKind === "sprinter") run.metrics.sprinterKills += 1;
  if (entity.enemyKind === "shield") run.metrics.shieldKills += 1;
  if (entity.enemyKind === "brute") run.metrics.bruteKills += 1;
}

function getWholeProgress(value = 0) {
  return Math.max(0, Math.round(value));
}
