import { DEFAULT_WEAPON_ID, findWeapon } from "../content/weapons.js";

export const BASE_STATS = Object.freeze({
  fireRate: 2.4,
  range: 13,
  ammo: 72,
  power: 6,
  projectileCount: 1,
  assistants: 0,
  incomeMultiplier: 1,
  weaponId: DEFAULT_WEAPON_ID,
});

export function buildStats(upgrades, modifiers = {}, weaponId = DEFAULT_WEAPON_ID) {
  const weapon = findWeapon(weaponId);
  const stats = {
    fireRate: (BASE_STATS.fireRate + upgradeLevel(upgrades, "fireRate") * 0.19) * weapon.fireRate,
    range: (BASE_STATS.range + upgradeLevel(upgrades, "range") * 0.65) * weapon.range,
    ammo: Math.round((BASE_STATS.ammo + upgradeLevel(upgrades, "ammo") * 7) * weapon.ammo),
    power: (BASE_STATS.power + upgradeLevel(upgrades, "power") * 1.7) * weapon.power,
    projectileCount: weapon.projectiles + upgradeLevel(upgrades, "doubleWeapon"),
    assistants: upgradeLevel(upgrades, "assistants"),
    incomeMultiplier: BASE_STATS.incomeMultiplier + upgradeLevel(upgrades, "income") * 0.12,
    weaponId: weapon.id,
  };

  return applyModifiers(stats, modifiers);
}

export function applyModifiers(stats, modifiers) {
  return {
    fireRate: Math.max(0.8, stats.fireRate + (modifiers.fireRate ?? 0)),
    range: Math.max(5, stats.range + (modifiers.range ?? 0)),
    ammo: Math.max(1, stats.ammo + (modifiers.ammo ?? 0)),
    power: Math.max(1, stats.power + (modifiers.power ?? 0)),
    projectileCount: Math.max(1, stats.projectileCount + (modifiers.doubleWeapon ?? 0)),
    assistants: Math.max(0, stats.assistants + (modifiers.assistants ?? 0)),
    incomeMultiplier: Math.max(0.5, stats.incomeMultiplier + (modifiers.income ?? 0)),
    weaponId: stats.weaponId,
  };
}

function upgradeLevel(upgrades, id) {
  return upgrades[id] ?? 0;
}
