import { ENTITY } from "../content/constants.js";

export const WALL_UNIT_CLEARANCE = 0.58;

const UNIT_TYPES = new Set([ENTITY.ENEMY, ENTITY.SHOOTER]);

export function enforceWallUnitClearance(entities) {
  const walls = entities.filter((entity) => entity.type === ENTITY.SOLID_WALL);
  const units = entities.filter((entity) => UNIT_TYPES.has(entity.type));
  walls.forEach((wall) => units.forEach((unit) => separateUnitBehindWall(wall, unit)));
  return entities;
}

export function getWallUnitGap(wall, unit) {
  const centerGap = unit.z - wall.z;
  return centerGap - wall.depth * 0.5 - unit.depth * 0.5;
}

function separateUnitBehindWall(wall, unit) {
  if (unit.z <= wall.z || !sharesVisualLane(wall, unit)) return;
  if (getWallUnitGap(wall, unit) >= WALL_UNIT_CLEARANCE) return;
  unit.z = Number((wall.z + wall.depth * 0.5 + unit.depth * 0.5 + WALL_UNIT_CLEARANCE).toFixed(2));
}

function sharesVisualLane(wall, unit) {
  return Math.abs(wall.x - unit.x) < (wall.width + unit.width) * 0.5;
}
