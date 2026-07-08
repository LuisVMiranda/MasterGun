import { ENTITY, LANES } from "../content/constants.js";
import { t, tStat } from "../content/i18n.js";
import { getPickupWeapon } from "../content/weapons.js";
import { choose } from "./math.js";
import { getLevelProfile } from "./progression.js";
import { createSeededRandom } from "./random.js";

const COMMON_BUFFS = Object.freeze(["fireRate", "range", "ammo", "power"]);
const RARE_BUFFS = Object.freeze(["doubleWeapon", "assistants"]);
const DEBUFFS = Object.freeze(["fireRate", "range", "ammo", "power"]);

export function createRoundPlan(level, seed, locale = "en") {
  const profile = getLevelProfile(level);
  const random = createSeededRandom(seed);
  const cursor = { id: 1, z: 12 };
  const entities = [];
  const context = { random, profile, locale };

  addOpeningTargets(entities, cursor, random, profile);
  addChallengeEvents(entities, cursor, context);
  addGateSequence(entities, cursor, context);
  addFinishLadder(entities, cursor, profile);

  return {
    seed,
    profile,
    entities,
    nextId: cursor.id,
  };
}

function addOpeningTargets(entities, cursor, random, profile) {
  const count = Math.min(profile.enemyCount, profile.band === "early" ? 5 : 8);

  for (let index = 0; index < count; index += 1) {
    entities.push(createEnemy(cursor, choose(LANES, random), profile.difficulty));
    cursor.z += 4.6;
  }
}

function addChallengeEvents(entities, cursor, context) {
  const { random, profile, locale } = context;
  if (!profile.challenge) return;

  for (let index = 0; index < 5; index += 1) {
    const stat = choose(COMMON_BUFFS, random);
    const value = getPickupValue(stat, profile, index);
    entities.push(createPickup(cursor, choose(LANES, random), cursor.z + 5 + index * 4.2, { stat, value, locale }));
  }

  const weapon = getPickupWeapon(profile.level, random);
  entities.push(createWeaponPickup(cursor, choose(LANES, random), cursor.z + 17, weapon, locale));
  entities.push(createBoss(cursor, 0, cursor.z + 26, profile, locale));
  cursor.z += 34;
}

function addGateSequence(entities, cursor, context) {
  const { random, profile } = context;
  for (let index = 0; index < profile.gateCount; index += 1) {
    const lanes = addGatePair(entities, cursor, context, index);
    addBlockedUpgrade(entities, cursor, lanes.buffLane, context, index);
    addPressureObject(entities, cursor, context, index);
    cursor.z += 8 + random() * 4;
  }
}

function addGatePair(entities, cursor, context, index) {
  const { random, profile, locale } = context;
  const lane = random() > 0.5 ? [-2.2, 2.2] : [2.2, -2.2];
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
  const z = cursor.z + 3.2;

  if (index < profile.walls) {
    entities.push(createSolidWall(cursor, choose(LANES, random), z, profile.difficulty, t(locale, "entity.wall")));
    return;
  }

  if (index < profile.walls + profile.walkers) {
    entities.push(createShooter(cursor, choose(LANES, random), z, { profile, shooterKind: "walker", locale }));
    return;
  }

  if (index < profile.walls + profile.walkers + profile.shooters) {
    entities.push(createShooter(cursor, choose(LANES, random), z, { profile, shooterKind: "still", locale }));
    return;
  }

  if (index < profile.walls + profile.walkers + profile.shooters + profile.barricades) {
    entities.push(createBarricade(cursor, choose(LANES, random), z, profile.difficulty));
    return;
  }

  if (profile.level >= 4 && random() < 0.08) {
    entities.push(createWeaponPickup(cursor, choose(LANES, random), z, getPickupWeapon(profile.level, random), locale));
    return;
  }

  if (profile.band !== "early" && random() < profile.hazardChance) {
    entities.push(createHazard(cursor, choose(LANES, random), z, profile.difficulty, locale));
    return;
  }

  entities.push(createEnemy(cursor, choose(LANES, random), profile.difficulty, z));
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
  return {
    id: cursor.id++,
    type: ENTITY.GATE,
    x,
    z: cursor.z,
    width: 1.05,
    depth: 0.35,
    gateType,
    stat,
    value,
    label: `${tStat(locale, stat)} ${formatSigned(value)}`,
    health: gateType === "buff" ? 10 : 16,
    maxHealth: gateType === "buff" ? 10 : 16,
    broken: false,
    active: true,
    collected: false,
  };
}

function createEnemy(cursor, x, difficulty, z = cursor.z) {
  const health = Math.round(10 + difficulty * 7);
  return {
    id: cursor.id++,
    type: ENTITY.ENEMY,
    x,
    z,
    width: 0.5,
    depth: 0.5,
    label: String(health),
    health,
    maxHealth: health,
    value: Math.round(12 + difficulty * 5),
    penalty: Math.round(18 + difficulty * 4),
    active: true,
  };
}

function createBarricade(cursor, x, z, difficulty) {
  const health = Math.round(28 + difficulty * 18);
  return {
    id: cursor.id++,
    type: ENTITY.BARRICADE,
    x,
    z,
    width: 1.05,
    depth: 0.55,
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
    width: 0.95,
    depth: 0.72,
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
    width: 0.55,
    depth: 0.58,
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
    width: 0.75,
    depth: 0.6,
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
    width: 0.75,
    depth: 0.45,
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
    width: 0.62,
    depth: 0.54,
    stat,
    value,
    label: `${tStat(locale, stat)} +${value}`,
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
    width: 0.7,
    depth: 0.6,
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
    width: 1.05,
    depth: 0.95,
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
