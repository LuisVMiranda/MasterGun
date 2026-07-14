import { ENTITY } from "../content/constants.js";
import { t, tStat } from "../content/i18n.js";
import { findWeapon } from "../content/weapons.js";
import { recordCashCollected, recordGreenBuff } from "./achievements.js";
import { applyAmmoGain } from "./ammoGain.js";
import { createSeededRandom } from "./random.js";
import { activateRunEffect, isRunEffect } from "./runEffects.js";
import { addTemporarySoldiers } from "./soldiers.js";
import { buildStats } from "./stats.js";

const RARE_BONUSES = new Set(["doubleWeapon", "soldiers", "specialShot", "noAmmoConsumption"]);

export function applyContactEffect(run, entity, source = "contact") {
  if (entity.type === ENTITY.CASH) {
    collectCash(run, entity);
    return;
  }

  if (entity.type === ENTITY.GATE) {
    applyGate(run, entity, source);
    return;
  }

  if (entity.type === ENTITY.HAZARD) {
    applyStatOrTimedEffect(run, entity);
    run.messages.push(createMessage(entity.label, "debuff"));
    return;
  }

  if (entity.type === ENTITY.PICKUP) {
    applyPickup(run, entity, source);
    return;
  }

  if (entity.type === ENTITY.WEAPON_PICKUP) {
    applyWeapon(run, entity.weaponId, source);
  }
}

export function applyDamageReward(run, entity) {
  if (entity.type === ENTITY.FINISH_BLOCK) {
    run.destroyedValue += entity.value ?? 0;
    run.finishTier += 1;
    maybeDropFinishCash(run, entity);
    run.messages.push(createMessage(t(run.locale, "message.finish", { value: entity.value }), "cash"));
    return;
  }

  if (shouldDropCash(entity)) {
    spawnCashDrop(run, entity, entity.value, entity.type);
  }
}

export function getFinishCashDrop(seed, entity) {
  const profile = getFinishCashProfile(entity);
  const random = createSeededRandom((seed ^ Math.imul(entity.id, 2654435761)) >>> 0);
  const drops = random() <= profile.chance;
  const value = Math.round(profile.value * (0.85 + random() * 0.35));
  return { ...profile, drops, value };
}

export function pruneMessages(run, dt) {
  run.messages = run.messages
    .map((message) => ({ ...message, ttl: message.ttl - dt }))
    .filter((message) => message.ttl > 0)
    .slice(-5);
}

function applyGate(run, entity, source) {
  if (isPositiveAmmoBank(entity)) {
    applyAmmoBank(run, entity, source);
    return;
  }

  if (entity.gateType === "buff") recordGreenBuff(run, entity.stat);
  applyStatOrTimedEffect(run, entity);
  queuePickupAudio(run, entity, source);
  run.messages.push(createMessage(entity.label, entity.gateType));
}

function applyPickup(run, entity, source) {
  if (isPositiveAmmoBank(entity)) {
    applyAmmoBank(run, entity, source);
    return;
  }

  recordGreenBuff(run, entity.stat);
  applyStatOrTimedEffect(run, entity);
  queueStandardPickupAudio(run, source);
  run.messages.push(createMessage(t(run.locale, "message.pickup", { stat: tStat(run.locale, entity.stat), value: entity.value }), "buff"));
}

function applyAmmoBank(run, entity, source) {
  if ((entity.ammoEarned ?? 0) > 0) recordGreenBuff(run, entity.stat);
  queueStandardPickupAudio(run, source);
  run.messages.push(createMessage(t(run.locale, "message.ammoBanked", { value: entity.ammoEarned ?? 0, cap: entity.ammoCap }), "buff"));
}

function addModifier(run, stat, value) {
  const supportStat = getSupportStat(stat);

  if (stat === "ammo") {
    if (value > 0) applyAmmoGain(run, value);
    else run.player.ammo = Math.max(0, run.player.ammo + value);
  }

  if (supportStat === "soldiers" && value > 0) {
    addTemporarySoldiers(run, value);
  }

  run.modifiers[supportStat] = (run.modifiers[supportStat] ?? 0) + value;
  run.stats = buildStats(run.upgradesSnapshot ?? {}, run.modifiers, run.weaponId);
}

function applyStatOrTimedEffect(run, entity) {
  if (isRunEffect(entity.stat)) {
    activateRunEffect(run, entity.stat);
    return;
  }
  addModifier(run, entity.stat, entity.value);
}

function getSupportStat(stat) {
  if (stat === "assistantAmmo" || stat === "soldierAmmo") return "soldierTraining";
  if (stat === "assistants") return "soldiers";
  return stat;
}

function applyWeapon(run, weaponId, source) {
  const weapon = findWeapon(weaponId);
  run.weaponId = weapon.id;
  run.stats = buildStats(run.upgradesSnapshot ?? {}, run.modifiers, weapon.id);
  run.player.ammo = Math.max(run.player.ammo, Math.round(run.stats.ammo * 0.45));
  queueStandardPickupAudio(run, source);
  run.messages.push(createMessage(t(run.locale, "message.weapon", { name: t(run.locale, weapon.labelKey) }), "buff"));
}

function collectCash(run, entity) {
  recordCashCollected(run, entity);
  run.destroyedValue += entity.value ?? 0;
  run.audioEvents.push({ type: "pickup" });
  run.messages.push(createMessage(t(run.locale, "message.cashCollected", { value: entity.value }), "cash"));
}

function shouldDropCash(entity) {
  return [ENTITY.ENEMY, ENTITY.SHOOTER, ENTITY.BOSS].includes(entity.type) && entity.value > 0;
}

function maybeDropFinishCash(run, entity) {
  const drop = getFinishCashDrop(run.seed, entity);
  if (drop.drops) spawnCashDrop(run, entity, drop.value, "finish");
}

function spawnCashDrop(run, entity, value, sourceType) {
  run.entities.push({
    id: run.nextId++,
    type: ENTITY.CASH,
    x: entity.x,
    z: entity.z + 0.35,
    width: 0.55,
    depth: 0.55,
    value,
    label: `$${value}`,
    sourceType,
    active: true,
    collected: false,
  });
  run.messages.push(createMessage(t(run.locale, "message.cashDropped"), "cash"));
}

function getFinishCashProfile(entity) {
  const health = Math.max(1, entity.maxHealth ?? entity.health ?? 1);
  const value = Math.max(8, Math.round((entity.value ?? health) * (0.18 + Math.min(0.52, health / 360))));
  return {
    chance: Math.min(0.8, 0.22 + health / 420),
    value,
  };
}

function isPositiveAmmoBank(entity) {
  return entity.stat === "ammo" && entity.value > 0 && entity.ammoCap;
}

function queuePickupAudio(run, entity, source) {
  if (["forceReload", "forceSoldierReload"].includes(entity.stat)) return;
  const rare = entity.gateType === "buff" && RARE_BONUSES.has(entity.stat);
  if (source === "shot" && !rare) return;
  const type = rare ? "rareBonus" : "pickup";
  run.audioEvents.push({ type });
}

function queueStandardPickupAudio(run, source) {
  if (source !== "shot") run.audioEvents.push({ type: "pickup" });
}

function createMessage(text, tone) {
  return { id: `${text}-${performance.now()}`, text, tone, ttl: 1.5 };
}
