import { ENTITY } from "../content/constants.js";
import { tStat } from "../content/i18n.js";

const SUPPORT_TYPES = new Set([ENTITY.GATE, ENTITY.PICKUP, ENTITY.HAZARD, ENTITY.WEAPON_PICKUP, ENTITY.RECRUITER, ENTITY.CASH]);

export function ensureModeAmmoRoute(plan, stats, options = {}) {
  const duration = options.duration ?? plan.profile.targetDuration;
  const intensity = options.intensity ?? 0.68;
  const required = Math.ceil(stats.fireRate * duration * intensity);
  const available = Math.round(stats.ammo + getExistingAmmo(plan.entities));
  const deficit = Math.max(0, required - available);
  if (deficit <= 0) return { required, available, added: 0 };

  const count = Math.min(18, Math.max(1, Math.ceil(deficit / 52)));
  const value = Math.ceil(deficit / count);
  const occupied = getOccupiedSlots(plan.entities);
  const start = Math.max(14, plan.profile.trackLength * 0.12);
  const end = Math.max(start + 10, plan.profile.trackLength * 0.86);
  for (let index = 0; index < count; index += 1) addAmmoPickup(plan, options.locale ?? "en", findSafeZ(index, count, start, end, occupied), value);
  return { required, available, added: count * value };
}

function addAmmoPickup(plan, locale, z, value) {
  const id = plan.nextId++;
  plan.entities.push({
    id, type: ENTITY.PICKUP, x: id % 2 ? -2.35 : 2.35, z, width: 0.72, depth: 0.62,
    stat: "ammo", value, ammoCap: value, ammoEarned: 0, label: `${tStat(locale, "ammo")} +${value}`,
    health: 1, maxHealth: 1, active: true, collected: false,
  });
}

function getExistingAmmo(entities) {
  return entities.filter((entity) => entity.stat === "ammo" && entity.value > 0).reduce((total, entity) => total + (entity.ammoCap ?? entity.value), 0);
}

function getOccupiedSlots(entities) {
  return entities.filter((entity) => SUPPORT_TYPES.has(entity.type)).map((entity) => entity.z);
}

function findSafeZ(index, count, start, end, occupied) {
  const progress = (index + 1) / (count + 1);
  let candidate = start + (end - start) * progress;
  for (let attempt = 0; attempt < 8 && isCrowded(candidate, occupied); attempt += 1) candidate += 4.5;
  const z = Number(Math.min(end, candidate).toFixed(2));
  occupied.push(z);
  return z;
}

function isCrowded(z, occupied) {
  return occupied.some((other) => Math.abs(other - z) < 8);
}
