import { TRACK } from "../content/constants.js";
import { clamp } from "./math.js";

export const RUN_EFFECTS = Object.freeze({
  thinProjectile: { duration: 6, tone: "debuff" },
  forceReload: { duration: 3, tone: "debuff" },
  forceSoldierReload: { duration: 3, tone: "debuff" },
  noAmmoConsumption: { duration: 6, tone: "buff" },
  specialShot: { duration: 5, tone: "buff" },
});

export function isRunEffect(id) {
  return Boolean(RUN_EFFECTS[id]);
}

export function activateRunEffect(run, id) {
  const definition = RUN_EFFECTS[id];
  if (!definition) return false;

  if (id === "specialShot") {
    run.specialShot = createSpecialShot(run.player.x, definition.duration, getSpecialShotRange(run));
    return true;
  }

  run.effects[id] = { id, remaining: definition.duration, ...definition };
  applyImmediateEffectState(run, id, definition.duration);
  if (id === "forceReload" || id === "forceSoldierReload") run.audioEvents.push({ type: "reload" });
  return true;
}

export function updateRunEffects(run, dt) {
  Object.values(run.effects).forEach((effect) => {
    effect.remaining = Math.max(0, effect.remaining - dt);
    if (effect.remaining <= 0) delete run.effects[effect.id];
  });
}

export function updateSpecialTargeting(run, input, dt) {
  const shot = run.specialShot;
  if (!shot?.active) return null;

  shot.remaining = Math.max(0, shot.remaining - dt);
  if (shot.lockedX === null) shot.aimX = getSweepingAimX(shot);
  const confirmed = lockSpecialAim(shot, input);
  if (!confirmed && shot.remaining > 0) return null;

  shot.active = false;
  return createSpecialProjectile(run, shot.lockedX ?? shot.aimX, shot.range);
}

export function advanceSpecialShot(run, input, dt) {
  const projectile = updateSpecialTargeting(run, input, dt);
  if (projectile) run.bullets.push(projectile);
  return Boolean(projectile);
}

export function getPlayerProjectileWidth(run, owner) {
  if (owner === "soldier") return 0.07;
  return hasRunEffect(run, "thinProjectile") ? 0.052 : 0.11;
}

export function getSpecialShotDamage(target) {
  if (target.type === "boss") return Math.min(target.health, target.maxHealth * 0.5);
  return Math.max(1, target.health);
}

export function isSpecialTargeting(run) {
  return Boolean(run.specialShot?.active);
}

export function hasRunEffect(run, id) {
  return (run.effects?.[id]?.remaining ?? 0) > 0;
}

export function getVisibleRunEffects(run) {
  const effects = Object.values(run?.effects ?? {});
  if (run?.specialShot?.active) {
    effects.unshift({ id: "specialShot", tone: "buff", remaining: run.specialShot.remaining });
  }
  return effects;
}

function createSpecialShot(playerX, duration, range) {
  return {
    active: true,
    remaining: duration,
    duration,
    range,
    aimX: playerX,
    lockedX: null,
    confirmWasDown: false,
  };
}

function getSweepingAimX(shot) {
  const elapsed = shot.duration - shot.remaining;
  return Math.sin(elapsed * 2.15) * (TRACK.halfWidth - 0.5);
}

function lockSpecialAim(shot, input) {
  const confirm = Boolean(input.confirmPressed);
  let locked = false;
  if (confirm && !shot.confirmWasDown && shot.lockedX === null) {
    shot.lockedX = shot.aimX;
    locked = true;
  }
  shot.confirmWasDown = confirm;
  return locked;
}

function createSpecialProjectile(run, targetX, distance) {
  const speed = 15;
  return {
    id: run.nextId++,
    owner: "player",
    special: true,
    x: run.player.x,
    z: 0.8,
    vx: ((clamp(targetX, -TRACK.halfWidth, TRACK.halfWidth) - run.player.x) / distance) * speed,
    speed,
    width: 0.5,
    depth: 0.42,
    damage: run.stats.power,
    remainingRange: distance,
    hitIds: [],
    active: true,
  };
}

function applyImmediateEffectState(run, id, duration) {
  if (id === "forceSoldierReload") {
    resetSoldierFire(run, duration);
    return;
  }
  if (id !== "thinProjectile" && id !== "forceReload") return;
  run.bullets.forEach((bullet) => {
    if (bullet.owner === "player" && !bullet.special) bullet.active = false;
  });
  if (id === "forceReload") run.player.shotTimer = Math.max(run.player.shotTimer, duration);
}

function resetSoldierFire(run, duration) {
  run.bullets.forEach((bullet) => {
    if (bullet.owner === "soldier") bullet.active = false;
  });
  run.soldiers.forEach((soldier) => {
    soldier.shotTimer = Math.max(soldier.shotTimer, duration);
  });
}

function getSpecialShotRange(run) {
  return Math.max(56, run.stats.range * 2);
}
