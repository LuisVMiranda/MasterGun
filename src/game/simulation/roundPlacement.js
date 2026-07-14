import { LANES, TRACK } from "../content/constants.js";
import { findWeapon } from "../content/weapons.js";
import { choose, clamp } from "./math.js";

export const START_Z = 12;
export const POWERUP_MIN_GAP = 8;
export const FINISH_ROW_GAP = 2.6;

const FINISH_APPROACH_GAP = 12;
const FINISH_EXIT_SECONDS = 2.5;
const MIN_FINISH_EXIT_DISTANCE = 20;
const TARGET_MARGIN = 0.78;

export function createPathSlots(profile, random, endZ = getGameplayEnd(profile), count = profile.gateCount) {
  const startZ = Math.min(START_Z + 24, getGameplayEnd(profile) - 12);
  return createSegmentSlots(count, startZ, endZ, random);
}

export function createSegmentSlots(count, startZ, endZ, random) {
  if (count <= 0) return [];

  const span = Math.max(1, endZ - startZ);
  const spacing = span / count;

  return Array.from({ length: count }, (_, index) => {
    const center = startZ + spacing * (index + 0.5);
    const wave = Math.sin((index + 1) * 1.91) * spacing * 0.2;
    const jitter = randomOffset(random, Math.min(spacing * 0.32, 6.5));
    return Number(clamp(center + wave + jitter, startZ, endZ).toFixed(2));
  }).sort((a, b) => a - b);
}

export function createSpacedSlots(count, startZ, endZ, random, minGap = 0) {
  if (count <= 0) return [];

  const available = Math.max(0, endZ - startZ);
  const slotCount = minGap > 0 ? Math.min(count, Math.max(1, Math.floor(available / minGap) + 1)) : count;
  if (slotCount <= 0) return [];

  const span = Math.max(slotCount, available);
  const spacing = slotCount > 1 ? span / (slotCount - 1) : span / 2;
  return Array.from({ length: slotCount }, (_, index) => {
    const safeJitter = minGap > 0 ? Math.max(0, (spacing - minGap) * 0.4) : spacing * 0.16;
    const jitter = randomOffset(random, Math.min(2.2, safeJitter));
    const base = slotCount > 1 ? startZ + spacing * index : startZ + spacing;
    return Number(clamp(base + jitter, startZ, endZ).toFixed(2));
  });
}

export function getGameplayEnd(profile) {
  return Math.max(START_Z + 44, getFinishRowStart(profile) - FINISH_APPROACH_GAP);
}

export function getFinishRowStart(profile) {
  return getFinishRowEnd(profile) - Math.max(0, profile.finishRows - 1) * FINISH_ROW_GAP;
}

export function getFinishRowEnd(profile) {
  return profile.trackLength - getFinishExitDistance(profile);
}

export function getFinishExitDistance(profile) {
  return Math.max(MIN_FINISH_EXIT_DISTANCE, profile.speed * FINISH_EXIT_SECONDS);
}

export function chooseTargetX(random) {
  const x = choose(LANES, random) + randomOffset(random, 0.52);
  return Number(clamp(x, -TRACK.halfWidth + TARGET_MARGIN, TRACK.halfWidth - TARGET_MARGIN).toFixed(2));
}

export function getReadablePressureOffset(random, profile) {
  if (profile.level < 70) return 4.4 + random() * 4.2;
  return getPressureOffset(random);
}

export function getGateSequenceCount(profile, endZ) {
  if (!profile.challenge) return profile.gateCount;
  const fullSpan = Math.max(1, getGameplayEnd(profile) - START_Z);
  const bossSpan = Math.max(1, endZ - START_Z);
  return Math.max(6, Math.round(profile.gateCount * clamp(bossSpan / fullSpan, 0.35, 0.75) * 0.9));
}

export function getAmmoSupportPickupCount(profile, weaponId, stats = null) {
  const budget = getAmmoBudget(profile, weaponId, stats);
  if (budget.deficit <= 0) return 0;
  return Math.min(10, Math.max(1, Math.ceil(budget.deficit / getPreferredPickupValue(profile))));
}

export function getAmmoSupportValue(profile, weaponId, index, stats = null) {
  const budget = getAmmoBudget(profile, weaponId, stats);
  const count = getAmmoSupportPickupCount(profile, weaponId, stats);
  if (count <= 0) return 0;

  const base = Math.floor(budget.deficit / count);
  return base + (index < budget.deficit % count ? 1 : 0);
}

export function randomOffset(random, amount) {
  return (random() - 0.5) * amount * 2;
}

function getPressureOffset(random) {
  if (random() > 0.72) return -(1.8 + random() * 1.4);
  return 2.35 + random() * 3.15;
}

function getAmmoBudget(profile, weaponId, stats = null) {
  const weapon = findWeapon(weaponId);
  const fireRate = stats?.fireRate ?? 2.4 * weapon.fireRate;
  const startingAmmo = stats?.ammo ?? Math.round(72 * weapon.ammo);
  const required = Math.ceil(fireRate * profile.targetDuration * 1.08);
  return { deficit: Math.max(0, required - startingAmmo), required, startingAmmo };
}

function getPreferredPickupValue(profile) {
  return Math.min(44, Math.round(18 + profile.difficulty * 0.9));
}
