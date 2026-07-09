import { ENTITY } from "../content/constants.js";
import { t, tStat } from "../content/i18n.js";
import { findWeapon } from "../content/weapons.js";
import { recordCashCollected, recordGreenBuff } from "./achievements.js";
import { createSeededRandom } from "./random.js";
import { buildStats } from "./stats.js";

export function applyContactEffect(run, entity) {
  if (entity.type === ENTITY.CASH) {
    collectCash(run, entity);
    return;
  }

  if (entity.type === ENTITY.GATE) {
    applyGate(run, entity);
    return;
  }

  if (entity.type === ENTITY.HAZARD) {
    addModifier(run, entity.stat, entity.value);
    run.messages.push(createMessage(`${tStat(run.locale, entity.stat)} ${entity.value}`, "debuff"));
    return;
  }

  if (entity.type === ENTITY.PICKUP) {
    applyPickup(run, entity);
    return;
  }

  if (entity.type === ENTITY.WEAPON_PICKUP) {
    applyWeapon(run, entity.weaponId);
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

function applyGate(run, entity) {
  if (isPositiveAmmoBank(entity)) {
    applyAmmoBank(run, entity);
    return;
  }

  if (entity.gateType === "buff") recordGreenBuff(run, entity.stat);
  addModifier(run, entity.stat, entity.value);
  run.messages.push(createMessage(entity.label, entity.gateType));
}

function applyPickup(run, entity) {
  if (isPositiveAmmoBank(entity)) {
    applyAmmoBank(run, entity);
    return;
  }

  recordGreenBuff(run, entity.stat);
  addModifier(run, entity.stat, entity.value);
  run.messages.push(createMessage(t(run.locale, "message.pickup", { stat: tStat(run.locale, entity.stat), value: entity.value }), "buff"));
}

function applyAmmoBank(run, entity) {
  if ((entity.ammoEarned ?? 0) > 0) recordGreenBuff(run, entity.stat);
  run.messages.push(createMessage(t(run.locale, "message.ammoBanked", { value: entity.ammoEarned ?? 0, cap: entity.ammoCap }), "buff"));
}

function addModifier(run, stat, value) {
  if (stat === "ammo") {
    run.player.ammo = Math.max(0, run.player.ammo + value);
  }

  if (stat === "assistantAmmo") {
    run.player.assistantAmmo = Math.max(0, run.player.assistantAmmo + value);
    if (value > 0) run.player.assistantTimer = 0;
  }

  run.modifiers[stat] = (run.modifiers[stat] ?? 0) + value;
  run.stats = buildStats(run.upgradesSnapshot ?? {}, run.modifiers, run.weaponId);
}

function applyWeapon(run, weaponId) {
  const weapon = findWeapon(weaponId);
  run.weaponId = weapon.id;
  run.stats = buildStats(run.upgradesSnapshot ?? {}, run.modifiers, weapon.id);
  run.player.ammo = Math.max(run.player.ammo, Math.round(run.stats.ammo * 0.45));
  run.messages.push(createMessage(t(run.locale, "message.weapon", { name: t(run.locale, weapon.labelKey) }), "buff"));
}

function collectCash(run, entity) {
  recordCashCollected(run, entity);
  run.destroyedValue += entity.value ?? 0;
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

function createMessage(text, tone) {
  return { id: `${text}-${performance.now()}`, text, tone, ttl: 1.5 };
}
