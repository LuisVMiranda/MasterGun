import { ENTITY } from "../content/constants.js";
import { tStat } from "../content/i18n.js";

const HOSTILE_TYPES = new Set([ENTITY.ENEMY, ENTITY.SHOOTER, ENTITY.BARRICADE, ENTITY.SOLID_WALL]);

export function applyMasteryDesign(plan, trial, locale) {
  const handlers = {
    pistol: designPistolTrial,
    shotgun: designShotgunTrial,
    machineGun: designMachineGunTrial,
    rifle: designRifleTrial,
  };
  handlers[trial.weaponId]?.(plan, trial, locale);
}

function designPistolTrial(plan, trial) {
  const hostiles = getHostiles(plan);
  if (["precision", "economy"].includes(trial.theme)) {
    hostiles.forEach((entity) => {
      entity.width = Number(Math.max(0.42, entity.width * 0.78).toFixed(2));
      entity.health = Math.min(entity.health, 3 + trial.act);
      entity.maxHealth = entity.health;
    });
  }
  if (["routing", "mobility"].includes(trial.theme)) setAlternatingLanes(hostiles, 2.55);
}

function designShotgunTrial(plan, trial, locale) {
  const hostiles = getHostiles(plan);
  hostiles.forEach((entity, index) => {
    if (index % 3 !== 0) return;
    entity.health = Math.max(entity.health, 5 + trial.act * 2);
    entity.maxHealth = entity.health;
    if (entity.type === ENTITY.ENEMY) entity.enemyKind = "shield";
  });
  if (["reload", "qualification"].includes(trial.theme)) addEffectHazards(plan, "forceReload", 2 + trial.act, locale);
}

function designMachineGunTrial(plan, trial) {
  const hostiles = getHostiles(plan);
  hostiles.forEach((entity) => {
    entity.health = Math.max(1, Math.round(entity.health * 0.72));
    entity.maxHealth = entity.health;
  });
  boostAmmoTargets(plan, 1.35 + trial.act * 0.08);
  if (["sweep", "pressure"].includes(trial.theme)) setAlternatingLanes(hostiles, 2.7);
}

function designRifleTrial(plan, trial) {
  const hostiles = getHostiles(plan);
  if (["weakPoints", "shields"].includes(trial.theme)) applyRifleShields(hostiles, trial.act);
  if (trial.theme === "movement") makeShootersWalk(plan.entities);
}

function applyRifleShields(hostiles, act) {
  hostiles.filter((entity, index) => entity.type === ENTITY.ENEMY && index % 3 === 0).forEach((entity) => {
    entity.enemyKind = "shield";
    entity.width = Number(Math.max(0.48, entity.width * 0.82).toFixed(2));
    entity.health = Math.max(entity.health, 4 + act * 2);
    entity.maxHealth = entity.health;
  });
}

function makeShootersWalk(entities) {
  entities.filter((entity) => entity.type === ENTITY.SHOOTER).forEach((entity) => { entity.shooterKind = "walker"; });
}

function addEffectHazards(plan, stat, count, locale) {
  for (let index = 0; index < count; index += 1) {
    const progress = (index + 1) / (count + 1);
    plan.entities.push({
      id: plan.nextId++, type: ENTITY.HAZARD, x: index % 2 ? -2.25 : 2.25,
      z: Number((plan.profile.trackLength * (0.14 + progress * 0.7)).toFixed(2)),
      width: 0.72, depth: 0.62, stat, value: 0, label: tStat(locale, stat),
      health: 1, maxHealth: 1, active: true, collected: false,
    });
  }
}

function boostAmmoTargets(plan, multiplier) {
  plan.entities.filter((entity) => entity.stat === "ammo" && entity.value > 0).forEach((entity) => {
    entity.value = Math.ceil(entity.value * multiplier);
    entity.ammoCap = Math.ceil((entity.ammoCap ?? entity.value) * multiplier);
  });
}

function setAlternatingLanes(entities, width) {
  const lanes = [-width, width, -width * 0.45, width * 0.55, 0];
  entities.forEach((entity, index) => { entity.x = lanes[(index * 3 + 1) % lanes.length]; });
}

function getHostiles(plan) {
  return plan.entities.filter((entity) => HOSTILE_TYPES.has(entity.type));
}
