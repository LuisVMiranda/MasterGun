import { ENTITY, LANES, TARGET_SCALE, TRACK } from "../content/constants.js";
import { t, tStat } from "../content/i18n.js";
import { getPickupWeapon } from "../content/weapons.js";
import { choose, clamp } from "./math.js";
import { getLevelProfile } from "./progression.js";
import { createSeededRandom } from "./random.js";

const COMMON_BUFFS = Object.freeze(["fireRate", "range", "ammo", "power"]);
const RARE_BUFFS = Object.freeze(["doubleWeapon", "assistants"]);
const DEBUFFS = Object.freeze(["fireRate", "range", "ammo", "power"]);
const START_Z = 12;
const FINISH_BUFFER = 18;
const TARGET_MARGIN = 0.78;

export function createRoundPlan(level, seed, locale = "en") {
  const profile = getLevelProfile(level);
  const random = createSeededRandom(seed);
  const cursor = { id: 1, z: START_Z };
  const entities = [];
  const context = { random, profile, locale };

  addOpeningTargets(entities, cursor, random, profile);
  addGateSequence(entities, cursor, context);
  addChallengeEvents(entities, cursor, context);
  addFinishLadder(entities, cursor, profile);
  entities.sort(sortByDistance);

  return {
    seed,
    profile,
    entities,
    nextId: cursor.id,
  };
}

function createPathSlots(profile, random) {
  const startZ = Math.min(START_Z + 24, getGameplayEnd(profile) - 12);
  return createSegmentSlots(profile.gateCount, startZ, getGameplayEnd(profile), random);
}

function createSegmentSlots(count, startZ, endZ, random) {
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

function getGameplayEnd(profile) {
  return Math.max(START_Z + 44, profile.trackLength - (profile.finishRows * 2.2 + FINISH_BUFFER));
}

function chooseTargetX(random) {
  const x = choose(LANES, random) + randomOffset(random, 0.52);
  return Number(clamp(x, -TRACK.halfWidth + TARGET_MARGIN, TRACK.halfWidth - TARGET_MARGIN).toFixed(2));
}

function createGateLanes(random) {
  const left = -2.95 + random() * 1.15;
  const right = 1.8 + random() * 1.15;
  return random() > 0.5 ? [left, right] : [right, left];
}

function getPressureOffset(random) {
  if (random() > 0.72) return -(1.8 + random() * 1.4);
  return 2.35 + random() * 3.15;
}

function randomOffset(random, amount) {
  return (random() - 0.5) * amount * 2;
}

function sortByDistance(first, second) {
  return first.z - second.z || first.id - second.id;
}

function addOpeningTargets(entities, cursor, random, profile) {
  const count = Math.min(profile.enemyCount, profile.band === "early" ? 3 : 4);
  const endZ = Math.min(getGameplayEnd(profile) * 0.25, START_Z + 54);
  const slots = createSegmentSlots(count, START_Z, endZ, random);

  for (let index = 0; index < count; index += 1) {
    entities.push(createEnemy(cursor, chooseTargetX(random), profile, slots[index]));
  }
}

function addChallengeEvents(entities, cursor, context) {
  const { random, profile, locale } = context;
  if (!profile.challenge) return;

  const startZ = Math.min(getGameplayEnd(profile) * 0.24, START_Z + 44);
  const pickupSlots = createSegmentSlots(5, startZ, startZ + 16, random);

  for (let index = 0; index < 5; index += 1) {
    const stat = choose(COMMON_BUFFS, random);
    const value = getPickupValue(stat, profile, index);
    entities.push(createPickup(cursor, chooseTargetX(random), pickupSlots[index], { stat, value, locale }));
  }

  const weapon = getPickupWeapon(profile.level, random);
  entities.push(createWeaponPickup(cursor, chooseTargetX(random), startZ + 13, weapon, locale));
  entities.push(createBoss(cursor, randomOffset(random, 1.05), startZ + 16, profile, locale));
}

function addGateSequence(entities, cursor, context) {
  const { random, profile } = context;
  const slots = createPathSlots(profile, random);

  for (let index = 0; index < profile.gateCount; index += 1) {
    cursor.z = slots[index];
    const lanes = addGatePair(entities, cursor, context, index);
    addBlockedUpgrade(entities, cursor, lanes.buffLane, context, index);
    addPressureObject(entities, cursor, context, index);
  }
}

function addGatePair(entities, cursor, context, index) {
  const { random, profile, locale } = context;
  const lane = createGateLanes(random);
  const buff = chooseBuff(random, profile, index);
  const debuff = choose(DEBUFFS, random);

  entities.push(createGate(cursor, lane[0], "buff", buff, { value: getBuffValue(buff, profile, index), locale }));
  entities.push(createGate(cursor, lane[1], "debuff", debuff, { value: getDebuffValue(debuff, profile), locale }));
  return { buffLane: lane[0], debuffLane: lane[1] };
}

function chooseBuff(random, profile, index) {
  if (!canRollRareBuff(profile, index)) return choose(COMMON_BUFFS, random);
  if (random() < getRareBuffChance(profile)) return choose(RARE_BUFFS, random);
  return choose(COMMON_BUFFS, random);
}

function canRollRareBuff(profile, index) {
  return profile.level >= 9 && index > 1;
}

function getRareBuffChance(profile) {
  if (profile.level >= 22) return 0.18;
  if (profile.level >= 15) return 0.13;
  return 0.08;
}

function addBlockedUpgrade(entities, cursor, x, context, index) {
  const { profile, locale } = context;
  if (index >= profile.blockedUpgrades) return;

  const z = cursor.z - 1.85;
  entities.push(createSolidWall(cursor, x, z, profile.difficulty, t(locale, "entity.upgradeBlock")));
}

function addPressureObject(entities, cursor, context, index) {
  const { random, profile, locale } = context;
  const z = cursor.z + getPressureOffset(random);

  if (index < profile.walls) {
    entities.push(createSolidWall(cursor, chooseTargetX(random), z, profile.difficulty, t(locale, "entity.wall")));
    return;
  }

  if (index < profile.walls + profile.walkers) {
    entities.push(createShooter(cursor, chooseTargetX(random), z, { profile, shooterKind: "walker", locale }));
    return;
  }

  if (index < profile.walls + profile.walkers + profile.shooters) {
    entities.push(createShooter(cursor, chooseTargetX(random), z, { profile, shooterKind: "still", locale }));
    return;
  }

  if (index < profile.walls + profile.walkers + profile.shooters + profile.barricades) {
    entities.push(createBarricade(cursor, chooseTargetX(random), z, profile.difficulty));
    return;
  }

  if (profile.level >= 4 && random() < 0.08) {
    entities.push(createWeaponPickup(cursor, chooseTargetX(random), z, getPickupWeapon(profile.level, random), locale));
    return;
  }

  if (profile.band !== "early" && random() < profile.hazardChance) {
    entities.push(createHazard(cursor, chooseTargetX(random), z, profile.difficulty, locale));
    return;
  }

  entities.push(createEnemy(cursor, chooseTargetX(random), profile, z));
}

function addFinishLadder(entities, cursor, profile) {
  const startZ = Math.max(cursor.z + 4, profile.trackLength - 24);

  for (let row = 0; row < profile.finishRows; row += 1) {
    const health = Math.round(20 + row * 13 * profile.difficulty);
    const value = Math.round(24 + row * 18 * profile.difficulty);
    entities.push(createFinishBlock(cursor, -1.25, startZ + row * 2.2, health, value));
    entities.push(createFinishBlock(cursor, 1.25, startZ + row * 2.2, health, value));
  }
}

function createGate(cursor, x, gateType, stat, details) {
  const { value, locale } = details;
  const health = gateType === "buff" ? 10 : 16;
  return {
    id: cursor.id++,
    type: ENTITY.GATE,
    x,
    z: cursor.z,
    width: size(1.05),
    depth: size(0.35),
    gateType,
    stat,
    value,
    label: `${tStat(locale, stat)} ${formatSigned(value)}`,
    health,
    maxHealth: health,
    ...createAmmoBank(stat, value),
    broken: false,
    active: true,
    collected: false,
  };
}

function createEnemy(cursor, x, profile, z = cursor.z) {
  const enemyKind = getEnemyKind(profile, cursor.id);
  const health = getEnemyHealth(profile, enemyKind);
  return {
    id: cursor.id++,
    type: ENTITY.ENEMY,
    enemyKind,
    x,
    z,
    width: size(0.5),
    depth: size(0.5),
    label: String(health),
    health,
    maxHealth: health,
    value: Math.round(12 + profile.difficulty * 5),
    penalty: Math.round(18 + profile.difficulty * 4),
    active: true,
  };
}

function getEnemyKind(profile, seed) {
  if (profile.level >= 120 && seed % 7 === 0) return "brute";
  if (profile.level >= 45 && seed % 5 === 0) return "shield";
  if (profile.level >= 20 && seed % 4 === 0) return "sprinter";
  return "runner";
}

function getEnemyHealth(profile, enemyKind) {
  const base = 8 + profile.difficulty * 3 + Math.max(0, profile.level - 4) * 0.18;
  const multipliers = { runner: 1, sprinter: 0.85, shield: 1.3, brute: 1.7 };
  return Math.max(2, Math.round(base * multipliers[enemyKind]));
}

function createBarricade(cursor, x, z, difficulty) {
  const health = Math.round(28 + difficulty * 18);
  return {
    id: cursor.id++,
    type: ENTITY.BARRICADE,
    x,
    z,
    width: size(1.05),
    depth: size(0.55),
    label: String(health),
    health,
    maxHealth: health,
    value: Math.round(20 + difficulty * 8),
    penalty: Math.round(24 + difficulty * 6),
    active: true,
  };
}

function createSolidWall(cursor, x, z, difficulty, label = "Wall") {
  const health = Math.round(60 + difficulty * 22);
  return {
    id: cursor.id++,
    type: ENTITY.SOLID_WALL,
    x,
    z,
    width: size(0.95),
    depth: size(0.72),
    label,
    health,
    maxHealth: health,
    value: Math.round(8 + difficulty * 4),
    penalty: Math.round(20 + difficulty * 5),
    active: true,
  };
}

function createShooter(cursor, x, z, details) {
  const { profile, shooterKind, locale } = details;
  const health = Math.round(18 + profile.difficulty * 9);
  return {
    id: cursor.id++,
    type: ENTITY.SHOOTER,
    shooterKind,
    x,
    originX: x,
    z,
    width: size(0.55),
    depth: size(0.58),
    label: shooterKind === "walker" ? t(locale, "entity.walker") : t(locale, "entity.shooter"),
    health,
    maxHealth: health,
    value: Math.round(28 + profile.difficulty * 8),
    shootCooldown: 0.8 + (cursor.id % 4) * 0.22,
    shootInterval: Math.max(0.9, 2.4 - profile.difficulty * 0.16),
    projectileSpeed: 12 + profile.difficulty * 0.7,
    penalty: Math.round(10 + profile.level * 2.2),
    active: true,
  };
}

function createHazard(cursor, x, z, difficulty, locale) {
  const value = -Math.round(8 + difficulty * 3);
  return {
    id: cursor.id++,
    type: ENTITY.HAZARD,
    x,
    z,
    width: size(0.75),
    depth: size(0.6),
    stat: "ammo",
    value,
    label: `${tStat(locale, "ammo")} ${value}`,
    active: true,
    collected: false,
  };
}

function createFinishBlock(cursor, x, z, health, value) {
  return {
    id: cursor.id++,
    type: ENTITY.FINISH_BLOCK,
    x,
    z,
    width: size(0.75),
    depth: size(0.45),
    label: String(value),
    health,
    maxHealth: health,
    value,
    penalty: Math.round(value * 0.4),
    active: true,
  };
}

function createPickup(cursor, x, z, details) {
  const { stat, value, locale } = details;
  const ammoHealth = getAmmoPickupHealth(stat, value);
  return {
    id: cursor.id++,
    type: ENTITY.PICKUP,
    x,
    z,
    width: size(0.62),
    depth: size(0.54),
    stat,
    value,
    label: `${tStat(locale, stat)} +${value}`,
    ...createAmmoBank(stat, value, ammoHealth),
    active: true,
    collected: false,
  };
}

function createWeaponPickup(cursor, x, z, weapon, locale) {
  return {
    id: cursor.id++,
    type: ENTITY.WEAPON_PICKUP,
    x,
    z,
    width: size(0.7),
    depth: size(0.6),
    weaponId: weapon.id,
    label: t(locale, weapon.labelKey),
    active: true,
    collected: false,
  };
}

function createBoss(cursor, x, z, profile, locale) {
  const health = Math.round(95 + profile.difficulty * 32);
  return {
    id: cursor.id++,
    type: ENTITY.BOSS,
    x,
    originX: x,
    z,
    width: size(1.05),
    depth: size(0.95),
    label: t(locale, "entity.boss"),
    health,
    maxHealth: health,
    value: Math.round(95 + profile.level * 12),
    shootCooldown: 0.45,
    shootInterval: Math.max(0.56, 1.1 - profile.difficulty * 0.04),
    projectileSpeed: 13 + profile.difficulty,
    retreatSpeed: profile.speed * 0.34,
    penalty: Math.round(55 + profile.level * 2.5),
    active: true,
  };
}

function size(value) {
  return Number((value * TARGET_SCALE).toFixed(3));
}

function createAmmoBank(stat, value, health) {
  if (stat !== "ammo" || value <= 0) return {};
  const cap = Math.max(1, Math.round(value));
  return {
    ammoCap: cap,
    ammoEarned: 0,
    ...(health ? { health, maxHealth: health } : {}),
  };
}

function getAmmoPickupHealth(stat, value) {
  if (stat !== "ammo" || value <= 0) return undefined;
  return Math.max(6, Math.round(value * 0.55));
}

function getBuffValue(stat, profile, index) {
  const scale = 1 + profile.difficulty * 0.14 + index * 0.03;
  const values = {
    fireRate: Number((0.35 * scale).toFixed(2)),
    range: Number((2.2 * scale).toFixed(1)),
    ammo: Math.round(18 * scale),
    power: Number((2.6 * scale).toFixed(1)),
    doubleWeapon: 1,
    assistants: 1,
  };
  return values[stat];
}

function getDebuffValue(stat, profile) {
  const scale = 1 + profile.difficulty * 0.1;
  const values = {
    fireRate: Number((-0.28 * scale).toFixed(2)),
    range: Number((-1.8 * scale).toFixed(1)),
    ammo: -Math.round(14 * scale),
    power: Number((-2.1 * scale).toFixed(1)),
  };
  return values[stat];
}

function getPickupValue(stat, profile, index) {
  const value = getBuffValue(stat, profile, index) * 0.75;
  return Number.isInteger(value) ? value : Number(value.toFixed(1));
}

function formatSigned(value) {
  return value > 0 ? `+${value}` : `${value}`;
}
