export const DEFAULT_WEAPON_ID = "pistol";

export const WEAPON_DEFINITIONS = Object.freeze([
  weapon({ id: "pistol", unlockLevel: 1, cost: 0, fireRate: 1.08, power: 0.92, range: 0.95, ammo: 1, projectiles: 1 }),
  weapon({ id: "shotgun", unlockLevel: 3, cost: 520, fireRate: 0.62, power: 1.65, range: 0.72, ammo: 0.82, projectiles: 3 }),
  weapon({ id: "machineGun", unlockLevel: 6, cost: 760, fireRate: 1.55, power: 0.72, range: 0.88, ammo: 1.25, projectiles: 1 }),
  weapon({ id: "rifle", unlockLevel: 9, cost: 980, fireRate: 0.82, power: 1.38, range: 1.48, ammo: 0.96, projectiles: 1 }),
  weapon({ id: "burst", unlockLevel: 14, cost: 1320, fireRate: 1.18, power: 1.05, range: 1.08, ammo: 1.08, projectiles: 2 }),
]);

export function createWeaponInventory() {
  return [DEFAULT_WEAPON_ID];
}

export function findWeapon(id) {
  return WEAPON_DEFINITIONS.find((weaponDefinition) => weaponDefinition.id === id) ?? WEAPON_DEFINITIONS[0];
}

export function getWeaponCost(weaponDefinition) {
  return weaponDefinition.cost;
}

export function getUnlockedWeapons(level) {
  return WEAPON_DEFINITIONS.filter((weaponDefinition) => weaponDefinition.unlockLevel <= level);
}

export function getPickupWeapon(level, random) {
  const unlocked = getUnlockedWeapons(Math.max(3, level)).filter((weaponDefinition) => weaponDefinition.id !== DEFAULT_WEAPON_ID);
  return unlocked[Math.floor(random() * unlocked.length) % unlocked.length] ?? findWeapon(DEFAULT_WEAPON_ID);
}

function weapon(config) {
  return {
    ...config,
    labelKey: `weapon.${config.id}.name`,
    descriptionKey: `weapon.${config.id}.desc`,
  };
}
