import { DEFAULT_WEAPON_ID, findWeapon } from "../content/weapons.js";

export const BASE_STATS = Object.freeze({
  fireRate: 2.4,
  range: 13,
  ammo: 72,
  power: 6,
  projectileCount: 1,
  assistants: 0,
  assistantAmmo: 0,
  baseLife: 0,
  incomeMultiplier: 1,
  wallDamageMultiplier: 1,
  shieldDamageMultiplier: 1,
  weaponId: DEFAULT_WEAPON_ID,
});

export function buildStats(upgrades, modifiers = {}, weaponId = DEFAULT_WEAPON_ID) {
  const weapon = findWeapon(weaponId);
  const stats = {
    fireRate: (BASE_STATS.fireRate + upgradeLevel(upgrades, "fireRate") * 0.19) * weapon.fireRate,
    range: (BASE_STATS.range + upgradeLevel(upgrades, "range") * 0.65) * weapon.range,
    ammo: Math.round((BASE_STATS.ammo + upgradeLevel(upgrades, "ammo") * 7) * weapon.ammo),
    power: (BASE_STATS.power + upgradeLevel(upgrades, "power") * 1.7) * weapon.power,
    projectileCount: weapon.projectiles,
    assistants: upgradeLevel(upgrades, "assistants"),
    assistantAmmo: getAssistantAmmo(upgrades),
    baseLife: upgradeLevel(upgrades, "baseLife") * 5,
    incomeMultiplier: BASE_STATS.incomeMultiplier + upgradeLevel(upgrades, "income") * 0.12,
    wallDamageMultiplier: getWallDamageMultiplier(upgrades),
    shieldDamageMultiplier: getShieldDamageMultiplier(upgrades),
    weaponId: weapon.id,
  };

  return applyModifiers(stats, modifiers);
}

export function applyModifiers(stats, modifiers) {
  return {
    fireRate: addWithFloor(stats.fireRate, modifiers, "fireRate", 0.8),
    range: addWithFloor(stats.range, modifiers, "range", 5),
    ammo: addWithFloor(stats.ammo, modifiers, "ammo", 1),
    power: addWithFloor(stats.power, modifiers, "power", 1),
    projectileCount: Math.max(1, stats.projectileCount + Math.min(1, getModifier(modifiers, "doubleWeapon"))),
    assistants: addWithFloor(stats.assistants, modifiers, "assistants", 0),
    assistantAmmo: addWithFloor(stats.assistantAmmo, modifiers, "assistantAmmo", 0),
    baseLife: addWithFloor(stats.baseLife, modifiers, "baseLife", 0),
    incomeMultiplier: addWithFloor(stats.incomeMultiplier, modifiers, "income", 0.5),
    wallDamageMultiplier: addWithFloor(stats.wallDamageMultiplier, modifiers, "wallDamage", 1),
    shieldDamageMultiplier: addWithFloor(stats.shieldDamageMultiplier, modifiers, "shieldDamage", 1),
    weaponId: stats.weaponId,
  };
}

function upgradeLevel(upgrades, id) {
  return upgrades[id] ?? 0;
}

function getAssistantAmmo(upgrades) {
  if (upgradeLevel(upgrades, "assistants") <= 0) return 0;
  return 18 + upgradeLevel(upgrades, "assistantAmmo") * 8;
}

function getWallDamageMultiplier(upgrades) {
  return BASE_STATS.wallDamageMultiplier + upgradeLevel(upgrades, "wallDamage") * 0.16 + upgradeLevel(upgrades, "breachDamage") * 0.1;
}

function getShieldDamageMultiplier(upgrades) {
  return BASE_STATS.shieldDamageMultiplier + upgradeLevel(upgrades, "shieldDamage") * 0.18 + upgradeLevel(upgrades, "breachDamage") * 0.1;
}

function addWithFloor(base, modifiers, id, floor) {
  return Math.max(floor, base + getModifier(modifiers, id));
}

function getModifier(modifiers, id) {
  return modifiers[id] ?? 0;
}
