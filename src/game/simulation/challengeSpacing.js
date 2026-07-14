import { ENTITY } from "../content/constants.js";
import { clamp } from "./math.js";
import { POWERUP_MIN_GAP, START_Z, randomOffset } from "./roundPlacement.js";

const GROUP_GAP = 2.45;
const BOSS_BUFFER = 11;

export function rebalanceChallengeRunway(entities, profile, random, bossZ) {
  if (!profile.challenge || !bossZ) return;

  const groups = createPreBossGroups(entities, bossZ);
  if (groups.length <= 1) return;

  const startZ = START_Z + getOpeningBuffer(profile.level);
  const endZ = bossZ - BOSS_BUFFER;
  const spacing = (endZ - startZ) / (groups.length + 1);
  const layout = { startZ, endZ, spacing, random };

  groups.forEach((group, index) => moveGroup(group, index, layout));
  enforcePowerupSpacing(entities, bossZ);
}

function createPreBossGroups(entities, bossZ) {
  return getPreBossEntities(entities, bossZ).reduce((groups, entity) => {
    const previous = groups.at(-1);
    if (previous && entity.z - previous.maxZ <= GROUP_GAP) {
      previous.items.push(entity);
      previous.maxZ = Math.max(previous.maxZ, entity.z);
      return groups;
    }

    groups.push({ items: [entity], maxZ: entity.z });
    return groups;
  }, []);
}

function getPreBossEntities(entities, bossZ) {
  return entities
    .filter((entity) => entity.type !== ENTITY.BOSS && entity.z > START_Z && entity.z < bossZ - 1)
    .filter((entity) => entity.type !== ENTITY.WEAPON_PICKUP || entity.z < bossZ - 14)
    .sort((first, second) => first.z - second.z || first.id - second.id);
}

function moveGroup(group, index, layout) {
  const minZ = Math.min(...group.items.map((entity) => entity.z));
  const maxZ = Math.max(...group.items.map((entity) => entity.z));
  const center = layout.startZ + layout.spacing * (index + 1);
  const jitter = randomOffset(layout.random, Math.min(1.2, layout.spacing * 0.1));
  const nextMin = clamp(center + jitter, layout.startZ, layout.endZ - Math.max(0, maxZ - minZ));
  const delta = Number((nextMin - minZ).toFixed(2));

  group.items.forEach((entity) => {
    entity.z = Number((entity.z + delta).toFixed(2));
  });
}

function getOpeningBuffer(level) {
  if (level <= 35) return 8;
  if (level <= 90) return 11;
  return 14;
}

function enforcePowerupSpacing(entities, bossZ) {
  const powerups = getPowerups(entities, bossZ);
  if (powerups.length <= 1) return;

  const minZ = START_Z + 16;
  const maxZ = bossZ - POWERUP_MIN_GAP;
  spreadForward(powerups, minZ);
  spreadBackward(powerups, maxZ);
  spreadForward(powerups, minZ);
  powerups.forEach((entity) => {
    entity.z = Number(clamp(entity.z, minZ, maxZ).toFixed(2));
  });
}

function getPowerups(entities, bossZ) {
  return entities
    .filter((entity) => (entity.type === ENTITY.PICKUP || entity.type === ENTITY.WEAPON_PICKUP) && entity.z > START_Z && entity.z < bossZ)
    .sort((first, second) => first.z - second.z || first.id - second.id);
}

function spreadForward(powerups, minZ) {
  powerups.forEach((entity, index) => {
    const previous = powerups[index - 1];
    const targetZ = previous ? previous.z + POWERUP_MIN_GAP : Math.max(entity.z, minZ);
    entity.z = Math.max(entity.z, targetZ);
  });
}

function spreadBackward(powerups, maxZ) {
  for (let index = powerups.length - 1; index >= 0; index -= 1) {
    const next = powerups[index + 1];
    const targetZ = next ? next.z - POWERUP_MIN_GAP : Math.min(powerups[index].z, maxZ);
    powerups[index].z = Math.min(powerups[index].z, targetZ);
  }
}
