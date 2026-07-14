import { ENTITY } from "../content/constants.js";

export function getSoldierTargetMultiplier(stats, target) {
  if (target.type === ENTITY.BOSS) return stats.soldierBossDamageMultiplier ?? 1;
  if (target.type === ENTITY.FINISH_BLOCK) return stats.soldierFinishDamageMultiplier ?? 1;
  if (isWallMaterial(target)) return stats.soldierWallDamageMultiplier ?? 1;
  if (target.enemyKind === "shield") return stats.soldierShieldDamageMultiplier ?? 1;
  return 1;
}

export function isWallMaterial(target) {
  return [ENTITY.BARRICADE, ENTITY.SOLID_WALL, ENTITY.FINISH_BLOCK].includes(target.type);
}
