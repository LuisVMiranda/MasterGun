import { ENTITY, TARGET_SCALE } from "../content/constants.js";
import { t, tStat } from "../content/i18n.js";
import { DEFAULT_WEAPON_ID, getPickupWeapon } from "../content/weapons.js";
import { choose, clamp } from "./math.js";
import { POWERUP_MIN_GAP, START_Z, chooseTargetX, createPathSlots } from "./roundPlacement.js";
import { createSegmentSlots, createSpacedSlots, getAmmoSupportPickupCount } from "./roundPlacement.js";
import { getAmmoSupportValue, getGameplayEnd, getGateSequenceCount } from "./roundPlacement.js";
import { getReadablePressureOffset, randomOffset } from "./roundPlacement.js";
import { getLevelProfile } from "./progression.js";
import { createSeededRandom } from "./random.js";

const COMMON_BUFFS = Object.freeze(["fireRate", "range", "ammo", "power"]);
const ASSISTANT_BUFFS = Object.freeze(["assistantAmmo"]);
const RARE_BUFFS = Object.freeze(["doubleWeapon", "assistants"]);
const DEBUFFS = Object.freeze(["fireRate", "range", "ammo", "power"]);

export function createRoundPlan(level, seed, locale = "en", weaponId = DEFAULT_WEAPON_ID) {
  const profile = getLevelProfile(level);
  const random = createSeededRandom(seed);
  const cursor = { id: 1, z: START_Z };
  const entities = [];
  const bossZ = profile.challenge ? getBossStartZ(profile, getGameplayEnd(profile)) : null;
  const context = { random, profile, locale, weaponId, bossZ, rarePlaced: new Set(), lastEnemyGateIndex: -99 };

  addOpeningTargets(entities, cursor, random, profile);
  addGateSequence(entities, cursor, context);
  addAmmoSupportPickups(entities, cursor, context);
  addChallengeEvents(entities, cursor, context);
  if (!profile.challenge) addFinishLadder(entities, cursor, profile);
  entities.sort(sortByDistance);

  return {
    seed,
    profile,
    entities,
    nextId: cursor.id,
  };
}

function createGateLanes(random) {
  const left = -2.95 + random() * 1.15;
  const right = 1.8 + random() * 1.15;
  return random() > 0.5 ? [left, right] : [right, left];
}

function sortByDistance(first, second) {
  return first.z - second.z || first.id - second.id;
}

function addOpeningTargets(entities, cursor, random, profile) {
  const count = Math.min(profile.enemyCount, getOpeningEnemyCount(profile));
  const endZ = Math.min(getGameplayEnd(profile) * 0.34, START_Z + 72);
  const slots = createSegmentSlots(count, START_Z, endZ, random);

  for (let index = 0; index < count; index += 1) {
    entities.push(createEnemy(cursor, chooseTargetX(random), profile, slots[index]));
  }
}

function getOpeningEnemyCount(profile) {
  if (profile.band === "late" || profile.band === "elite") return 4;
  return 3;
}

function addChallengeEvents(entities, cursor, context) {
  const { random, profile, locale } = context;
  if (!profile.challenge) return;

  const bossZ = context.bossZ;
  const pickupSlots = createSpacedSlots(6, START_Z + 30, bossZ - 18, random, POWERUP_MIN_GAP);

  addBossGauntlet(entities, cursor, context, bossZ);

  for (let index = 0; index < pickupSlots.length; index += 1) {
    if (!isPowerupSlotClear(entities, pickupSlots[index])) continue;
    const stat = choose(COMMON_BUFFS, random);
    const value = getPickupValue(stat, profile, index);
    entities.push(createPickup(cursor, chooseTargetX(random), pickupSlots[index], { stat, value, locale }));
  }

  const weapon = getPickupWeapon(profile.level, random);
  if (isPowerupSlotClear(entities, bossZ - 10)) {
    entities.push(createWeaponPickup(cursor, chooseTargetX(random), bossZ - 10, weapon, locale));
  }
  entities.push(createBoss(cursor, randomOffset(random, 1.05), bossZ, profile, locale));
}

function getBossStartZ(profile, gameplayEnd) {
  const base = gameplayEnd * (profile.level >= 80 ? 0.48 : 0.52);
  return Number(clamp(base, START_Z + 82, gameplayEnd - 20).toFixed(2));
}

function addBossGauntlet(entities, cursor, context, bossZ) {
  const { random, profile, locale } = context;
  const slots = createSegmentSlots(getBossGuardCount(profile), START_Z + 22, bossZ - 24, random);
  slots.forEach((z, index) => addBossGuard(entities, cursor, context, z, index));
  entities.push(createSolidWall(cursor, chooseTargetX(random), bossZ - 22, profile.difficulty, t(locale, "entity.wall")));
  entities.push(createShooter(cursor, chooseTargetX(random), bossZ - 17, { profile, shooterKind: "walker", locale }));
}

function getBossGuardCount(profile) {
  return Math.min(9, 4 + Math.floor(profile.level / 35));
}

function addBossGuard(entities, cursor, context, z, index) {
  const { random, profile, locale } = context;
  const pattern = index % 5;

  if (pattern === 1) {
    entities.push(createShooter(cursor, chooseTargetX(random), z, { profile, shooterKind: "still", locale }));
    return;
  }

  if (pattern === 3) {
    entities.push(createBarricade(cursor, chooseTargetX(random), z, profile.difficulty));
    return;
  }

  const kind = getBossEnemyKind(profile, index);
  entities.push(createEnemy(cursor, chooseTargetX(random), profile, z, kind));
}

function getBossEnemyKind(profile, index) {
  if (profile.level >= 120 && index % 4 === 0) return "brute";
  if (profile.level >= 75 && index % 4 === 0) return "shield";
  if (profile.level >= 20 && index % 2 === 0) return "sprinter";
  return "runner";
}

function addGateSequence(entities, cursor, context) {
  const { random, profile } = context;
  const endZ = context.bossZ ? Math.max(START_Z + 44, context.bossZ - 16) : getGameplayEnd(profile);
  const slots = createPathSlots(profile, random, endZ, getGateSequenceCount(profile, endZ));

  for (let index = 0; index < slots.length; index += 1) {
    cursor.z = slots[index];
    const lanes = addGatePair(entities, cursor, context, index);
    addBlockedUpgrade(entities, cursor, lanes.buffLane, context, index);
    addPressureObject(entities, cursor, context, index, lanes);
  }
}

function addGatePair(entities, cursor, context, index) {
  const { random, profile, locale } = context;
  const lane = createGateLanes(random);
  const buff = chooseBuff(context, index);
  const debuff = choose(DEBUFFS, random);

  entities.push(createGate(cursor, lane[0], "buff", buff, { value: getBuffValue(buff, profile, index), locale }));
  entities.push(createGate(cursor, lane[1], "debuff", debuff, { value: getDebuffValue(debuff, profile), locale }));
  return { buffLane: lane[0], debuffLane: lane[1] };
}

function chooseBuff(context, index) {
  const { random, profile } = context;
  const commonBuffs = getCommonBuffs(profile);
  if (!canRollRareBuff(profile, index)) return choose(commonBuffs, random);
  if (random() >= getRareBuffChance(profile)) return choose(commonBuffs, random);

  const rareBuff = choose(getAvailableRareBuffs(context), random);
  if (!rareBuff) return choose(commonBuffs, random);
  context.rarePlaced.add(rareBuff);
  return rareBuff;
}

function getCommonBuffs(profile) {
  return profile.level >= 12 ? [...COMMON_BUFFS, ...ASSISTANT_BUFFS] : COMMON_BUFFS;
}

function getAvailableRareBuffs(context) {
  return RARE_BUFFS.filter((buff) => buff !== "doubleWeapon" || !context.rarePlaced.has(buff));
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

function addPressureObject(entities, cursor, context, index, lanes) {
  const { random, profile, locale } = context;
  const z = cursor.z + getReadablePressureOffset(random, profile);
  const x = choosePressureX(random, profile, lanes);
  const kind = getPressureKind(entities, context, index, z);
  if (!kind) return;

  addPressureEntity(entities, cursor, { kind, x, z, profile, locale, random });
}

function getPressureKind(entities, context, index, z) {
  const { random, profile } = context;
  const fixedKind = getFixedPressureKind(profile, index);
  if (fixedKind) return fixedKind;

  if (profile.level >= 4 && random() < 0.08 && isPowerupSlotClear(entities, z)) {
    return "weapon";
  }

  if (profile.band !== "early" && random() < profile.hazardChance) {
    return "hazard";
  }

  if (!shouldSpawnRoamingEnemy(context, index)) return;
  return "enemy";
}

function getFixedPressureKind(profile, index) {
  const ranges = [
    [profile.walls, "wall"],
    [profile.walls + profile.walkers, "walker"],
    [profile.walls + profile.walkers + profile.shooters, "shooter"],
    [profile.walls + profile.walkers + profile.shooters + profile.barricades, "barricade"],
  ];
  return ranges.find(([limit]) => index < limit)?.[1];
}

function addPressureEntity(entities, cursor, details) {
  const { kind, x, z, profile, locale, random } = details;
  const factories = {
    wall: () => createSolidWall(cursor, x, z, profile.difficulty, t(locale, "entity.wall")),
    walker: () => createShooter(cursor, x, z, { profile, shooterKind: "walker", locale }),
    shooter: () => createShooter(cursor, x, z, { profile, shooterKind: "still", locale }),
    barricade: () => createBarricade(cursor, x, z, profile.difficulty),
    weapon: () => createWeaponPickup(cursor, x, z, getPickupWeapon(profile.level, random), locale),
    hazard: () => createHazard(cursor, x, z, profile.difficulty, locale),
    enemy: () => createEnemy(cursor, x, profile, z),
  };

  entities.push(factories[kind]());
}

function choosePressureX(random, profile, lanes) {
  if (profile.level >= 70 || !lanes) return chooseTargetX(random);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const x = chooseTargetX(random);
    if ([lanes.buffLane, lanes.debuffLane].every((lane) => Math.abs(x - lane) > 1.1)) return x;
  }

  return chooseTargetX(random);
}

function shouldSpawnRoamingEnemy(context, index) {
  const { profile, random } = context;
  const gap = profile.level <= 30 ? 1 : 0;
  if (index - context.lastEnemyGateIndex <= gap) return false;
  if (random() >= getRoamingEnemyChance(profile.level)) return false;

  context.lastEnemyGateIndex = index;
  return true;
}

function getRoamingEnemyChance(level) {
  if (level <= 30) return 0.76;
  if (level <= 80) return 0.7;
  return 0.72;
}

function addAmmoSupportPickups(entities, cursor, context) {
  const { random, profile, locale, weaponId } = context;
  const count = getAmmoSupportPickupCount(profile, weaponId);
  if (count <= 0) return;

  const endZ = Math.max(START_Z + 50, (context.bossZ ?? getGameplayEnd(profile)) - 22);
  const slots = createSpacedSlots(count, START_Z + 44, endZ, random, POWERUP_MIN_GAP);

  slots.forEach((z, index) => {
    if (!isPowerupSlotClear(entities, z)) return;
    entities.push(createPickup(cursor, chooseTargetX(random), z, { stat: "ammo", value: getAmmoSupportValue(profile, weaponId, index), locale }));
  });
}

function isPowerupSlotClear(entities, z) {
  return entities.every((entity) => !isFloorPowerup(entity) || Math.abs(entity.z - z) >= POWERUP_MIN_GAP);
}

function isFloorPowerup(entity) {
  return entity.type === ENTITY.PICKUP || entity.type === ENTITY.WEAPON_PICKUP;
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
  const health = gateType === "buff" ? 5 : 16;
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

function createEnemy(cursor, x, profile, z = cursor.z, kind = null) {
  const enemyKind = kind ?? getEnemyKind(profile, cursor.id);
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
  if (profile.level >= 65 && seed % 6 === 0) return "shield";
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
    health: 1,
    maxHealth: 1,
    ...createAmmoBank(stat, value),
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
  const stats = getBossStats(profile);
  return {
    id: cursor.id++,
    type: ENTITY.BOSS,
    x,
    originX: x,
    z,
    width: size(1.05),
    depth: size(0.95),
    label: t(locale, "entity.boss"),
    health: stats.health,
    maxHealth: stats.health,
    value: stats.value,
    shootCooldown: 0.45,
    shootInterval: stats.shootInterval,
    projectileSpeed: stats.projectileSpeed,
    retreatSpeed: profile.speed * getBossRetreatScale(profile.level),
    penalty: stats.penalty,
    active: true,
  };
}

function getBossStats(profile) {
  const lateHealth = Math.max(0, profile.level - 80) * 4.2;
  const eliteHealth = Math.max(0, profile.level - 150) * 3.4;
  return {
    health: Math.round(110 + profile.level * 4.6 + lateHealth + eliteHealth + profile.difficulty * 18),
    value: Math.round(110 + profile.level * 14 + profile.difficulty * 18),
    shootInterval: Math.max(0.48, 1.18 - profile.difficulty * 0.035 - profile.level * 0.0009),
    projectileSpeed: Number((12.5 + profile.difficulty * 0.95).toFixed(2)),
    penalty: Math.round(45 + profile.level * 2.9 + profile.difficulty * 2),
  };
}

function getBossRetreatScale(level) {
  if (level >= 140) return 0.42;
  if (level >= 80) return 0.38;
  return 0.34;
}

function size(value) {
  return Number((value * TARGET_SCALE).toFixed(3));
}

function createAmmoBank(stat, value) {
  if (stat !== "ammo" || value <= 0) return {};
  const cap = Math.max(1, Math.round(value));
  return {
    ammoCap: cap,
    ammoEarned: 0,
  };
}

function getBuffValue(stat, profile, index) {
  const scale = 1 + profile.difficulty * 0.14 + index * 0.03;
  const values = {
    fireRate: Number((0.35 * scale).toFixed(2)),
    range: Number((2.2 * scale).toFixed(1)),
    ammo: Math.round(18 * scale),
    assistantAmmo: Math.round(12 * scale),
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
