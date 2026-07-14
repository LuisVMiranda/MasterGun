import { ENTITY } from "../content/constants.js";
import { intersects } from "./math.js";

const ENEMY_SHOT_BLOCKERS = new Set([
  ENTITY.BARRICADE,
  ENTITY.SOLID_WALL,
  ENTITY.FINISH_BLOCK,
  ENTITY.BOSS,
]);

export function getProjectileHitBox(projectile) {
  const previousZ = projectile.previousZ ?? projectile.z;
  const minZ = Math.min(previousZ, projectile.z);
  const maxZ = Math.max(previousZ, projectile.z);

  return {
    ...projectile,
    z: (minZ + maxZ) / 2,
    depth: projectile.depth + (maxZ - minZ),
  };
}

export function findEnemyShotBlocker(entities, projectile) {
  const hitBox = getProjectileHitBox(projectile);
  return entities.find((entity) => entity.id !== projectile.sourceId && isEnemyShotBlocker(entity) && intersects(hitBox, entity));
}

export function blockEnemyShots(run) {
  run.enemyProjectiles.forEach((projectile) => {
    if (!projectile.active || !findEnemyShotBlocker(run.entities, projectile)) return;
    projectile.active = false;
  });
}

function isEnemyShotBlocker(entity) {
  if (!entity.active || entity.health <= 0) return false;
  return ENEMY_SHOT_BLOCKERS.has(entity.type) || entity.enemyKind === "shield";
}
