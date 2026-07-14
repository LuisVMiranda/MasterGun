import { ENTITY, TRACK } from "../content/constants.js";
import { clamp } from "./math.js";
import { getGameplayEnd, POWERUP_MIN_GAP, randomOffset, START_Z } from "./roundPlacement.js";

const GROUP_Z_TOLERANCE = 0.7;
const START_BUFFER = 10;
const END_BUFFER = 9;
const HOSTILE_TYPES = new Set([ENTITY.ENEMY, ENTITY.SHOOTER, ENTITY.BARRICADE, ENTITY.SOLID_WALL]);
const EXCLUDED_TYPES = new Set([ENTITY.BOSS, ENTITY.FINISH_BLOCK]);

export function rebalanceRoundLayout(entities, profile, random, bossZ) {
  const groups = createEncounterGroups(entities, bossZ);
  if (groups.length === 0) return;

  const startZ = START_Z + START_BUFFER;
  const endZ = getLayoutEnd(profile, bossZ);
  const totalWeight = groups.reduce((total, group) => total + group.items.length, 0);
  let consumedWeight = 0;
  groups.forEach((group) => {
    placeGroup(group, consumedWeight, totalWeight, { startZ, endZ, random });
    consumedWeight += group.items.length;
  });
  enforcePickupSpacing(entities, startZ, endZ, bossZ);
  breakRepeatedHostileLanes(entities, random, bossZ);
}

function createEncounterGroups(entities, bossZ) {
  return getLayoutEntities(entities, bossZ).reduce((groups, entity) => {
    const previous = groups.at(-1);
    if (previous && entity.z - previous.anchorZ <= GROUP_Z_TOLERANCE) {
      previous.items.push(entity);
      return groups;
    }

    groups.push({ anchorZ: entity.z, items: [entity] });
    return groups;
  }, []);
}

function getLayoutEntities(entities, bossZ) {
  return entities
    .filter((entity) => !EXCLUDED_TYPES.has(entity.type))
    .filter((entity) => !bossZ || entity.z < bossZ)
    .sort((first, second) => first.z - second.z || first.id - second.id);
}

function placeGroup(group, consumedWeight, totalWeight, layout) {
  const progress = (consumedWeight + group.items.length / 2) / totalWeight;
  const center = layout.startZ + (layout.endZ - layout.startZ) * progress;
  const edgeScale = Math.sin(progress * Math.PI);
  const averageSpacing = (layout.endZ - layout.startZ) / totalWeight;
  const jitter = randomOffset(layout.random, Math.min(1.8, averageSpacing * 0.18)) * edgeScale;
  const targetZ = clamp(center + jitter, layout.startZ, layout.endZ);
  const delta = Number((targetZ - group.anchorZ).toFixed(2));

  group.items.forEach((entity) => {
    entity.z = Number((entity.z + delta).toFixed(2));
  });
}

function enforcePickupSpacing(entities, startZ, endZ, bossZ) {
  const pickups = entities
    .filter((entity) => [ENTITY.PICKUP, ENTITY.WEAPON_PICKUP].includes(entity.type))
    .filter((entity) => !bossZ || entity.z < bossZ)
    .sort((first, second) => first.z - second.z || first.id - second.id);
  if (pickups.length <= 1) return;

  spreadPickupsForward(pickups, startZ);
  spreadPickupsBackward(pickups, endZ);
  spreadPickupsForward(pickups, startZ);
}

function spreadPickupsForward(pickups, minZ) {
  pickups.forEach((entity, index) => {
    const previous = pickups[index - 1];
    entity.z = Math.max(entity.z, previous ? previous.z + POWERUP_MIN_GAP : minZ);
  });
}

function spreadPickupsBackward(pickups, maxZ) {
  for (let index = pickups.length - 1; index >= 0; index -= 1) {
    const next = pickups[index + 1];
    pickups[index].z = Math.min(pickups[index].z, next ? next.z - POWERUP_MIN_GAP : maxZ);
  }
}

function getLayoutEnd(profile, bossZ) {
  if (bossZ) return Math.max(START_Z + 40, bossZ - END_BUFFER);
  return Math.max(START_Z + 40, getGameplayEnd(profile) - 4);
}

function breakRepeatedHostileLanes(entities, random, bossZ) {
  const hostiles = entities
    .filter((entity) => HOSTILE_TYPES.has(entity.type) && (!bossZ || entity.z < bossZ))
    .sort((first, second) => first.z - second.z || first.id - second.id);
  let previousLanes = [];

  hostiles.forEach((entity) => {
    let lane = getLane(entity.x);
    if (previousLanes.length === 2 && previousLanes.every((value) => value === lane)) {
      entity.x = chooseDifferentX(random, lane);
      lane = getLane(entity.x);
    }
    previousLanes = [...previousLanes, lane].slice(-2);
  });
}

function chooseDifferentX(random, blockedLane) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const x = Number((randomOffset(random, TRACK.halfWidth - 0.85)).toFixed(2));
    if (getLane(x) !== blockedLane) return x;
  }
  return blockedLane >= 0 ? -2.45 : 2.45;
}

function getLane(x) {
  return Math.round(x / 1.1);
}
