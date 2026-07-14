export const RARE_RUN_BUFFS = Object.freeze(["doubleWeapon", "soldiers", "specialShot", "noAmmoConsumption"]);

const DEBUFFS = Object.freeze(["fireRate", "range", "power", "thinProjectile", "forceReload", "ammo"]);

export function getRunDebuffs(level) {
  return level < 12 ? DEBUFFS : [...DEBUFFS, "forceSoldierReload"];
}

export function chooseRunDebuff(context) {
  const pool = getRunDebuffs(context.profile.level);
  const available = context.ammoDebuffPlaced ? pool.filter((effect) => effect !== "ammo") : pool;
  const selected = available[Math.floor(context.random() * available.length) % available.length];
  if (selected === "ammo") context.ammoDebuffPlaced = true;
  return selected;
}

export function isRareRunBuffAvailable(context, buff) {
  if (buff === "specialShot" && context.profile.level < 15) return false;
  if (buff === "noAmmoConsumption" && context.profile.level < 8) return false;
  return buff !== "doubleWeapon" || !context.rarePlaced.has(buff);
}
