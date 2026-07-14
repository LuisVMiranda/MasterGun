import { TRACK } from "../content/constants.js";
import { t } from "../content/i18n.js";
import { clamp, intersects } from "./math.js";
import { getProjectileHitBox } from "./projectiles.js";
import { getSoldierShotDamage, getSoldierShotInterval } from "./soldierBalance.js";
import { hasRunEffect } from "./runEffects.js";

const SOLDIER_LIMIT = 8;
const SOLDIER_DECAY_PER_SECOND = 0.045;

export function addTemporarySoldiers(run, count, options = {}) {
  const added = [];
  const limit = Math.max(0, Math.floor(count));

  for (let index = 0; index < limit && getActiveSoldiers(run).length < SOLDIER_LIMIT; index += 1) {
    const soldier = createSoldier(run, options);
    run.soldiers.push(soldier);
    added.push(soldier);
  }

  return added.length;
}

export function recruitSoldierFromHit(run, target) {
  const current = target.recruited ?? 0;
  if (current >= target.recruitCap) return false;

  const added = addTemporarySoldiers(run, 1);
  if (!added) return false;
  target.recruited = current + 1;
  target.health = Math.max(0, target.recruitCap - target.recruited);
  run.messages.push({ id: `recruit-${target.id}-${target.recruited}`, text: t(run.locale, "message.recruited", { value: target.recruited }), tone: "buff", ttl: 1.1 });
  return true;
}

export function updateSoldiers(run, dt, shoot) {
  const soldiers = getActiveSoldiers(run);
  soldiers.forEach((soldier, index) => updateSoldier(run, soldier, index, dt, shoot));
  run.soldiers = soldiers.filter((soldier) => soldier.active && soldier.health > 0);
}

export function damageRecruitSoldier(run, projectile) {
  const hitBox = getProjectileHitBox(projectile);
  const soldier = getActiveSoldiers(run).find((item) => intersects(hitBox, item));
  if (!soldier) return false;

  soldier.health -= getSoldierProjectileDamage(run);
  soldier.active = soldier.health > 0;
  projectile.active = false;
  run.damageNumbers.push({
    id: run.nextId++,
    text: t(run.locale, "message.soldierHit"),
    tone: "penalty",
    value: 1,
    x: soldier.x,
    y: 1.45,
    z: soldier.z + 0.35,
    ttl: 0.68,
    maxTtl: 0.68,
  });
  return true;
}

function updateSoldier(run, soldier, index, dt, shoot) {
  soldier.health -= SOLDIER_DECAY_PER_SECOND * dt;
  soldier.x = getSoldierX(run.player.x, index);
  soldier.z = -0.9 - Math.floor(index / 4) * 0.42;
  soldier.shotTimer -= dt;

  if (soldier.shotTimer <= 0 && !hasRunEffect(run, "forceSoldierReload")) {
    shoot(soldier.x, 0.18, 1, "soldier", getSoldierShotDamage(run));
    soldier.shotTimer = getSoldierShotInterval(run, index);
  }
}

function createSoldier(run, options) {
  const health = options.health ?? getSoldierHealth(run.level);
  return {
    id: run.nextId++,
    health,
    maxHealth: health,
    shotTimer: options.shotDelay ?? 0,
    x: run.player.x,
    z: -0.9,
    width: 0.22,
    depth: 0.24,
    active: true,
  };
}

function getSoldierX(playerX, index) {
  const side = index % 2 ? 1 : -1;
  const row = Math.floor(index / 2);
  return clamp(playerX + side * (0.82 + row * 0.36), -TRACK.halfWidth + 0.35, TRACK.halfWidth - 0.35);
}

function getSoldierHealth(level) {
  return 2 + Math.floor(Math.min(level, 160) / 55);
}

function getSoldierProjectileDamage(run) {
  if (run.level >= 120) return 2;
  return 1;
}

function getActiveSoldiers(run) {
  return (run.soldiers ?? []).filter((soldier) => soldier.active && soldier.health > 0).slice(0, SOLDIER_LIMIT);
}
