import { ENTITY } from "../content/constants.js";
import { findBossFight } from "../content/bossRush.js";
import { getEndlessSectorProfile } from "../content/endless.js";
import { findMasteryTrial } from "../content/masteryTrials.js";
import { createWeeklyChallenge } from "../content/weeklyChallenge.js";
import { createRoundPlan } from "./roundGenerator.js";
import { tStat } from "../content/i18n.js";
import { applyMasteryDesign } from "./masteryDesign.js";
import { ensureModeAmmoRoute } from "./modeAmmoRoute.js";

const STRUCTURAL_TYPES = new Set([ENTITY.ENEMY, ENTITY.SHOOTER, ENTITY.BARRICADE, ENTITY.SOLID_WALL, ENTITY.BOSS, ENTITY.FINISH_BLOCK]);
const DENSITY_TYPES = new Set([ENTITY.ENEMY, ENTITY.SHOOTER, ENTITY.BARRICADE]);
const ENDLESS_PRE_SUPPORT_BUDGET = 200;

export function createMasteryModePlan(selection, setup) {
  const trial = findMasteryTrial(selection.masteryWeapon, selection.masteryTrial);
  const level = getMasteryProfileLevel(trial);
  const plan = createRoundPlan(level, setup.seed, setup.locale, trial.weaponId, setup.stats);
  plan.entities = plan.entities.filter((entity) => entity.type !== ENTITY.WEAPON_PICKUP);
  scalePlanDuration(plan, trial.duration);
  scaleEntityPressure(plan.entities, getMasteryPressure(trial));
  applyMasteryDesign(plan, trial, setup.locale);
  ensureModeAmmoRoute(plan, setup.stats, { duration: trial.duration, intensity: getMasteryFireIntensity(trial.weaponId), locale: setup.locale });
  plan.profile = { ...plan.profile, mode: "weaponMastery", name: trial.id };
  return { ...plan, level: trial.number, weaponId: trial.weaponId, modeContext: { trial } };
}

export function createBossRushModePlan(selection, setup) {
  const fight = findBossFight(selection.bossFight);
  const plan = createRoundPlan(fight.profileLevel, setup.seed, setup.locale, setup.weaponId, setup.stats);
  const boss = plan.entities.find((entity) => entity.type === ENTITY.BOSS);
  plan.entities = plan.entities.filter((entity) => entity.type !== ENTITY.WEAPON_PICKUP && entity.type !== ENTITY.FINISH_BLOCK);
  configureBossRunway(plan, boss, fight, setup.stats);
  ensureForcedReload(plan, setup.locale, fight.approachSeconds);
  ensureModeAmmoRoute(plan, setup.stats, { duration: fight.approachSeconds, intensity: 0.62, locale: setup.locale });
  plan.profile = { ...plan.profile, mode: "bossRush", name: fight.id, challenge: true };
  return { ...plan, level: fight.number, modeContext: { fight } };
}

export function createWeeklyModePlan(selection, setup) {
  const challenge = createWeeklyChallenge(selection.weeklyDifficulty, setup.highestArcadeClear, setup.now);
  const plan = createRoundPlan(challenge.difficulty.profileLevel, challenge.seed, setup.locale, challenge.weaponId, setup.stats);
  plan.entities = plan.entities.filter((entity) => entity.type !== ENTITY.WEAPON_PICKUP);
  scalePlanDuration(plan, challenge.difficulty.duration);
  scaleEntityPressure(plan.entities, 0.9 + challenge.difficulty.rewardMultiplier * 0.2);
  applyWeeklyModifiers(plan, challenge, setup.locale);
  addWeeklyCashRoute(plan, challenge);
  ensureModeAmmoRoute(plan, setup.stats, { duration: challenge.difficulty.duration, intensity: 0.7, locale: setup.locale });
  plan.profile = { ...plan.profile, mode: "weekly", name: challenge.id, challenge: true, baseReward: 0 };
  return { ...plan, seed: challenge.seed, level: challenge.difficulty.profileLevel, weaponId: challenge.weaponId, modeContext: { challenge } };
}

function addWeeklyCashRoute(plan, challenge) {
  const count = 12;
  const total = Math.ceil(challenge.cashTarget * 1.28);
  const value = Math.ceil(total / count);
  for (let index = 0; index < count; index += 1) {
    const progress = (index + 1) / (count + 1);
    plan.entities.push({
      id: plan.nextId++,
      type: ENTITY.CASH,
      x: ((index * 5) % 3 - 1) * 2.15,
      z: Number((plan.profile.trackLength * (0.08 + progress * 0.82)).toFixed(2)),
      width: 0.55,
      depth: 0.55,
      value,
      label: `$${value}`,
      sourceType: "weekly",
      active: true,
      collected: false,
    });
  }
}

function ensureForcedReload(plan, locale, approachSeconds) {
  if (plan.entities.some((entity) => entity.stat === "forceReload")) return;
  plan.entities.push(createEffectTarget(plan, "forceReload", "debuff", plan.profile.speed * approachSeconds * 0.58, locale));
}

function applyWeeklyModifiers(plan, challenge, locale) {
  challenge.modifiers.forEach((modifier, index) => {
    if (modifier === "shieldPressure") {
      applyShieldPressure(plan.entities, challenge.difficulty.id);
      return;
    }
    const positive = ["noAmmoConsumption", "specialShot"].includes(modifier);
    const progress = (index + 1) / (challenge.modifiers.length + 1);
    const z = plan.profile.trackLength * (0.18 + progress * 0.58);
    plan.entities.push(createEffectTarget(plan, modifier, positive ? "buff" : "debuff", z, locale));
  });
}

function applyShieldPressure(entities, difficulty) {
  const interval = difficulty === "hard" ? 3 : difficulty === "medium" ? 5 : 7;
  entities.filter((entity) => entity.type === ENTITY.ENEMY).forEach((enemy, index) => {
    if (index % interval !== 0) return;
    enemy.enemyKind = "shield";
    enemy.health = Math.round(enemy.health * 1.25);
    enemy.maxHealth = enemy.health;
  });
}

function createEffectTarget(plan, stat, tone, z, locale) {
  const pickup = tone === "buff";
  return {
    id: plan.nextId++,
    type: pickup ? ENTITY.PICKUP : ENTITY.HAZARD,
    x: plan.nextId % 2 ? -2.2 : 2.2,
    z: Number(z.toFixed(2)),
    width: 0.72,
    depth: 0.62,
    stat,
    value: 0,
    label: tStat(locale, stat),
    health: 1,
    maxHealth: 1,
    active: true,
    collected: false,
  };
}

export function createEndlessModePlan(operation, setup) {
  const sectorProfile = getEndlessSectorProfile(operation.sector);
  const level = getEndlessProfileLevel(operation.sector, sectorProfile.boss);
  const plan = createRoundPlan(level, operation.seed ^ operation.sector, setup.locale, setup.weaponId, setup.stats);
  scalePlanDuration(plan, sectorProfile.duration);
  scaleEntityPressure(plan.entities, sectorProfile.healthScale, sectorProfile.damageScale, sectorProfile.rewardScale);
  addDensity(plan, sectorProfile, setup.seed);
  trimEndlessDensity(plan);
  ensureModeAmmoRoute(plan, setup.stats, { duration: sectorProfile.duration, intensity: 0.68, locale: setup.locale });
  plan.profile = {
    ...plan.profile,
    mode: "endless",
    name: `sector-${operation.sector}`,
    challenge: sectorProfile.boss,
    speed: plan.profile.speed * sectorProfile.speedScale,
    baseReward: Math.round(plan.profile.baseReward * sectorProfile.rewardScale),
  };
  return { ...plan, level: 200 + operation.sector, modeContext: { sector: operation.sector, sectorProfile } };
}

function configureBossRunway(plan, boss, fight, stats) {
  if (!boss) return;
  const approachLength = plan.profile.speed * fight.approachSeconds;
  const guards = plan.entities.filter((entity) => entity.id !== boss.id);
  distributeEntities(guards, 14, approachLength);
  const engageZ = Math.max(10, Math.min(18, stats.range * 0.78));
  const closingSpeed = Math.max(0.06, (engageZ - 1.5) / fight.fightSeconds);
  const dps = stats.power * stats.fireRate * stats.projectileCount;
  boss.z = approachLength + engageZ;
  boss.engageZ = engageZ;
  boss.retreatSpeed = Math.max(0, plan.profile.speed - closingSpeed);
  boss.health = Math.round(dps * fight.fightSeconds * 0.72 * (1 + fight.tier * 0.08));
  boss.maxHealth = boss.health;
  boss.value = 500 + fight.number * 90;
  boss.penalty = Math.min(18, 8 + fight.tier * 2);
  boss.bossFamily = fight.family.id;
  boss.shotPattern = fight.family.pattern;
  boss.projectileColor = fight.family.projectileColor;
  boss.signatureSkill = fight.family.skill;
  boss.skillTier = fight.tier;
  boss.skillCooldown = 9;
  boss.healUses = 0;
  plan.profile.trackLength = Math.round(approachLength);
  plan.profile.targetDuration = fight.approachSeconds + fight.fightSeconds;
}

function scalePlanDuration(plan, duration) {
  const targetLength = Math.round(plan.profile.speed * duration);
  const firstZ = Math.min(...plan.entities.map((entity) => entity.z));
  const desiredStart = Math.max(12, plan.profile.speed * 2.35);
  const factor = (targetLength - desiredStart) / Math.max(1, plan.profile.trackLength - firstZ);
  plan.entities.forEach((entity) => { entity.z = Number((desiredStart + (entity.z - firstZ) * factor).toFixed(2)); });
  plan.profile = { ...plan.profile, targetDuration: duration, trackLength: targetLength };
}

function scaleEntityPressure(entities, healthScale, damageScale = healthScale, rewardScale = 1) {
  entities.forEach((entity) => {
    if (STRUCTURAL_TYPES.has(entity.type) && entity.maxHealth) {
      entity.health = Math.max(1, Math.round(entity.health * healthScale));
      entity.maxHealth = entity.health;
    }
    if (entity.penalty) entity.penalty = Math.max(1, Math.round(entity.penalty * damageScale));
    if (entity.value) entity.value = Math.max(1, Math.round(entity.value * rewardScale));
  });
}

function distributeEntities(entities, startZ, endZ) {
  const ordered = [...entities].sort((first, second) => first.z - second.z);
  ordered.forEach((entity, index) => {
    const progress = (index + 1) / (ordered.length + 1);
    entity.z = Number((startZ + (endZ - startZ) * progress).toFixed(2));
  });
}

function addDensity(plan, profile, seed) {
  const hostiles = plan.entities.filter((entity) => DENSITY_TYPES.has(entity.type));
  const copies = Math.min(18, Math.round(hostiles.length * (profile.densityScale - 1)));
  for (let index = 0; index < copies; index += 1) {
    const source = hostiles[(seed + index * 7) % hostiles.length];
    if (!source) break;
    plan.entities.push({ ...source, id: plan.nextId++, x: -source.x, z: source.z + 3.5 + (index % 3) * 1.8 });
  }
}

function trimEndlessDensity(plan) {
  const overflow = Math.max(0, plan.entities.length - ENDLESS_PRE_SUPPORT_BUDGET);
  if (overflow === 0) return;
  const removable = plan.entities.filter((entity) => DENSITY_TYPES.has(entity.type));
  const removed = new Set();
  for (let index = 0; index < overflow; index += 1) {
    const target = removable[Math.floor(index * removable.length / overflow)];
    if (target) removed.add(target.id);
  }
  plan.entities = plan.entities.filter((entity) => !removed.has(entity.id));
}

function getMasteryPressure(trial) {
  const identity = { pistol: 0.78, shotgun: 1.25, machineGun: 0.7, rifle: 1.08 }[trial.weaponId];
  return identity * (0.82 + trial.number * 0.035);
}

function getMasteryFireIntensity(weaponId) {
  return { pistol: 0.54, shotgun: 0.44, machineGun: 0.72, rifle: 0.52 }[weaponId] ?? 0.6;
}

function getMasteryProfileLevel(trial) {
  let level = 14 + trial.number * 3;
  if (trial.checkpoint) return Math.ceil(level / 5) * 5;
  if (level % 5 === 0) level += 1;
  return level;
}

function getEndlessProfileLevel(sector, boss) {
  let level = Math.min(200, 80 + sector * 4);
  if (boss) return Math.max(5, Math.floor(level / 5) * 5);
  if (level % 5 === 0) level -= 1;
  return level;
}
