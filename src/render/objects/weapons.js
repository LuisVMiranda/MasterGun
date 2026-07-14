import { animateApprovedWeapon, createApprovedWeapon } from "./approvedWeapons.js";

export function createWeaponObject(weaponId = "pistol", options = {}) {
  const weapon = createApprovedWeapon(weaponId, options);
  weapon.userData.productionAsset = true;
  return weapon;
}

export function animateWeaponObject(weapon, time, firing = false) {
  animateApprovedWeapon(weapon, time, firing);
}
