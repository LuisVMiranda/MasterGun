import { ENTITY } from "../content/constants.js";
import { t, tStat } from "../content/i18n.js";
import { findWeapon } from "../content/weapons.js";
import { buildStats } from "./stats.js";

export function applyContactEffect(run, entity) {
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
    addModifier(run, entity.stat, entity.value);
    run.messages.push(createMessage(t(run.locale, "message.pickup", { stat: tStat(run.locale, entity.stat), value: entity.value }), "buff"));
    return;
  }

  if (entity.type === ENTITY.WEAPON_PICKUP) {
    applyWeapon(run, entity.weaponId);
  }
}

export function applyDamageReward(run, entity) {
  run.destroyedValue += entity.value ?? 0;

  if (entity.type === ENTITY.FINISH_BLOCK) {
    run.finishTier += 1;
    run.messages.push(createMessage(t(run.locale, "message.finish", { value: entity.value }), "cash"));
    return;
  }

  if (entity.value) {
    run.messages.push(createMessage(`+$${entity.value}`, "cash"));
  }
}

export function pruneMessages(run, dt) {
  run.messages = run.messages
    .map((message) => ({ ...message, ttl: message.ttl - dt }))
    .filter((message) => message.ttl > 0)
    .slice(-5);
}

function applyGate(run, entity) {
  addModifier(run, entity.stat, entity.value);
  run.messages.push(createMessage(entity.label, entity.gateType));
}

function addModifier(run, stat, value) {
  if (stat === "ammo") {
    run.player.ammo = Math.max(0, run.player.ammo + value);
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

function createMessage(text, tone) {
  return { id: `${text}-${performance.now()}`, text, tone, ttl: 1.5 };
}
