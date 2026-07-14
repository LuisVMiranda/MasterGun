import { describe, expect, it } from "vitest";
import { ENTITY, LANES, TARGET_SCALE } from "../../src/game/content/constants.js";
import { LEVEL_PROFILES, getTargetDurationSeconds } from "../../src/game/content/levelProfiles.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";
import { getLevelProfile } from "../../src/game/simulation/progression.js";
import { buildStats } from "../../src/game/simulation/stats.js";
import { getWallUnitGap, WALL_UNIT_CLEARANCE } from "../../src/game/simulation/roundOcclusion.js";
import { FINISH_ROW_GAP, getFinishExitDistance, getFinishRowStart, getGameplayEnd } from "../../src/game/simulation/roundPlacement.js";

describe("createRoundPlan", () => {
  it("creates repeatable rounds from the same seed", () => {
    const first = createRoundPlan(30, 1234);
    const second = createRoundPlan(30, 1234);

    expect(first.entities).toEqual(second.entities);
    expect(first.profile.band).toBe("mid");
  });

  it("includes green buffs, red debuffs, pressure objects, and finish blocks", () => {
    const plan = createRoundPlan(16, 555);
    const gateTypes = plan.entities.filter((entity) => entity.type === ENTITY.GATE).map((entity) => entity.gateType);
    const finishBlocks = plan.entities.filter((entity) => entity.type === ENTITY.FINISH_BLOCK);

    expect(gateTypes).toContain("buff");
    expect(gateTypes).toContain("debuff");
    expect(plan.entities.some((entity) => entity.type === ENTITY.BARRICADE)).toBe(true);
    expect(finishBlocks.length).toBeGreaterThan(8);
  });

  it("reserves a complete pre-finish harvesting zone for every money row", () => {
    [1, 16, 79, 199].forEach((level) => {
      const plan = createRoundPlan(level, 6000 + level);
      const finish = plan.entities.filter((entity) => entity.type === ENTITY.FINISH_BLOCK);
      const rows = [...new Set(finish.map((entity) => entity.z))].sort((a, b) => a - b);

      expect(rows).toHaveLength(plan.profile.finishRows);
      expect(rows[0]).toBeCloseTo(getFinishRowStart(plan.profile));
      expect(rows.at(-1)).toBeLessThanOrEqual(plan.profile.trackLength - getFinishExitDistance(plan.profile));
      expect(getFinishExitDistance(plan.profile) / plan.profile.speed).toBeCloseTo(2.5);
      expect(rows[0] - getGameplayEnd(plan.profile)).toBeGreaterThanOrEqual(11.9);
      rows.slice(1).forEach((z, index) => expect(z - rows[index]).toBeCloseTo(FINISH_ROW_GAP));
      rows.forEach((z) => expect(finish.filter((entity) => entity.z === z)).toHaveLength(2));
    });
  });

  it("projects 200 levels with growing pressure and capped duration", () => {
    const first = LEVEL_PROFILES[0];
    const last = LEVEL_PROFILES[199];
    const durations = [1, 9, 10, 20, 170, 180, 200].map(getTargetDurationSeconds);

    expect(LEVEL_PROFILES).toHaveLength(200);
    expect(last.trackLength).toBeGreaterThan(first.trackLength);
    expect(last.shooters + last.walkers + last.walls).toBeGreaterThan(first.shooters + first.walkers + first.walls);
    expect(last.baseReward / last.difficulty).toBeLessThan(100);
    expect(durations).toEqual([30, 30, 35, 40, 115, 120, 120]);
  });

  it("keeps generated run durations aligned to the target curve", () => {
    [1, 10, 20, 75, 120, 180, 200].forEach((level) => {
      const profile = getLevelProfile(level);
      const duration = profile.trackLength / profile.speed;

      expect(duration).toBeGreaterThanOrEqual(profile.targetDuration - 0.08);
      expect(duration).toBeLessThanOrEqual(120.08);
    });
  });

  it("makes first-run enemies beatable with about two starter pistol shots", () => {
    const plan = createRoundPlan(1, 123);
    const enemies = plan.entities.filter((entity) => entity.type === ENTITY.ENEMY);

    expect(enemies[0].health).toBeLessThanOrEqual(12);
    expect(enemies[0].health).toBeGreaterThanOrEqual(10);
  });

  it("spreads active targets across early, mid, and late runway sections", () => {
    [1, 41, 121, 199].forEach((level) => {
      const plan = createRoundPlan(level, 4040 + level);
      const targets = plan.entities.filter((entity) => entity.type !== ENTITY.FINISH_BLOCK);
      const spread = Math.max(...targets.map((entity) => entity.z)) - Math.min(...targets.map((entity) => entity.z));
      const sections = countRunwaySections(targets, plan.profile.trackLength);

      expect(spread).toBeGreaterThan(plan.profile.trackLength * 0.62);
      expect(sections.every((count) => count > 0)).toBe(true);
    });
  });

  it("uses irregular lane placement instead of only fixed lane patterns", () => {
    const plan = createRoundPlan(80, 8080);
    const offLaneTargets = plan.entities.filter((entity) => !LANES.some((lane) => Math.abs(lane - entity.x) < 0.04));

    expect(offLaneTargets.length).toBeGreaterThan(plan.entities.length * 0.55);
  });

  it("scales generated target hit boxes by the visibility scale", () => {
    const plan = createRoundPlan(5, 5050);
    const enemy = plan.entities.find((entity) => entity.type === ENTITY.ENEMY);
    const pickup = plan.entities.find((entity) => entity.type === ENTITY.PICKUP);

    expect(enemy.width).toBeCloseTo(0.5 * TARGET_SCALE);
    expect(enemy.depth).toBeCloseTo(0.5 * TARGET_SCALE);
    expect(pickup.width).toBeCloseTo(0.62 * TARGET_SCALE);
  });

  it("keeps green buff gates hittable by starter pistol shots", () => {
    const plan = createRoundPlan(12, 1212);
    const pistolPower = buildStats({}, {}, "pistol").power;
    const buffGates = plan.entities.filter((entity) => entity.type === ENTITY.GATE && entity.gateType === "buff");

    expect(buffGates.length).toBeGreaterThan(0);
    expect(buffGates.every((gate) => gate.health <= pistolPower)).toBe(true);
  });

  it("generates diverse enemy variants in late projected levels", () => {
    const plans = [120, 160, 200].map((level) => createRoundPlan(level, 700 + level));
    const variants = new Set(plans.flatMap((plan) => plan.entities.filter((entity) => entity.type === ENTITY.ENEMY).map((entity) => entity.enemyKind)));

    expect(variants.has("runner")).toBe(true);
    expect(variants.has("sprinter") || variants.has("shield")).toBe(true);
    expect(variants.has("brute")).toBe(true);
  });

  it("adds walls, blocked routes, still shooters, and walking shooters", () => {
    const plan = createRoundPlan(18, 2222);
    const types = plan.entities.map((entity) => entity.type);
    const shooters = plan.entities.filter((entity) => entity.type === ENTITY.SHOOTER);

    expect(types).toContain(ENTITY.SOLID_WALL);
    expect(shooters.some((entity) => entity.shooterKind === "still")).toBe(true);
    expect(shooters.some((entity) => entity.shooterKind === "walker")).toBe(true);
    expect(plan.entities.some((entity) => entity.label === "Upgrade Block")).toBe(true);
  });

  it("keeps level 25 wall and shield pressure moderate", () => {
    const plan = createRoundPlan(25, 2525);
    const walls = plan.entities.filter((entity) => entity.type === ENTITY.SOLID_WALL);
    const barricades = plan.entities.filter((entity) => entity.type === ENTITY.BARRICADE);
    const shieldEnemies = plan.entities.filter((entity) => entity.enemyKind === "shield");

    expect(walls.length).toBeLessThanOrEqual(1);
    expect(barricades.length).toBeLessThanOrEqual(4);
    expect(shieldEnemies).toHaveLength(0);
  });

  it("keeps level 25 enemies lighter and scattered for pistol runs", () => {
    const plans = Array.from({ length: 30 }, (_, index) => createRoundPlan(25, 25000 + index));
    const averageEnemies = averageCount(plans, (entity) => entity.type === ENTITY.ENEMY);
    const averageShooters = averageCount(plans, (entity) => entity.type === ENTITY.SHOOTER);
    const representative = createRoundPlan(25, 2525);
    const boss = representative.entities.find((entity) => entity.type === ENTITY.BOSS);
    const representativeHostiles = getHostiles(representative);
    const sections = countRunwaySections(representativeHostiles, boss.z);

    expect(averageEnemies).toBeLessThanOrEqual(9);
    expect(averageShooters).toBeLessThanOrEqual(4.2);
    expect(sections.filter(Boolean).length).toBeGreaterThanOrEqual(3);
  });

  it("keeps units behind walls visually separated across the full ladder", () => {
    Array.from({ length: 200 }, (_, index) => createRoundPlan(index + 1, 6100 + index)).forEach((plan) => {
      const walls = plan.entities.filter((entity) => entity.type === ENTITY.SOLID_WALL);
      const units = plan.entities.filter((entity) => [ENTITY.ENEMY, ENTITY.SHOOTER].includes(entity.type));
      walls.forEach((wall) => units.filter((unit) => isBehindSameLane(wall, unit)).forEach((unit) => {
        expect(getWallUnitGap(wall, unit), `level ${plan.profile.level}`).toBeGreaterThanOrEqual(WALL_UNIT_CLEARANCE - 0.01);
      }));
    });
  });

  it("adds curated checkpoint guards, spaced pickups, and a catchable boss every five levels", () => {
    const plan = createRoundPlan(10, 321);
    const bosses = plan.entities.filter((entity) => entity.type === ENTITY.BOSS);
    const boss = bosses[0];
    const pickups = plan.entities.filter((entity) => entity.type === ENTITY.PICKUP);
    const weaponPickups = plan.entities.filter((entity) => entity.type === ENTITY.WEAPON_PICKUP);
    const guards = plan.entities.filter((entity) => entity.z < boss.z);
    const afterBoss = plan.entities.filter((entity) => entity.z > boss.z + 0.01);
    const guardTypes = new Set(guards.map((entity) => entity.type));
    const shooters = guards.filter((entity) => entity.type === ENTITY.SHOOTER);
    const catchTime = boss.z / (plan.profile.speed - boss.retreatSpeed);

    expect(plan.profile.challenge).toBe(true);
    expect(bosses).toHaveLength(1);
    expect(boss.z).toBeGreaterThan(plan.profile.trackLength * 0.35);
    expect(afterBoss).toHaveLength(0);
    expect(plan.entities.some((entity) => entity.type === ENTITY.FINISH_BLOCK)).toBe(false);
    expect(guardTypes.has(ENTITY.ENEMY)).toBe(true);
    expect(guardTypes.has(ENTITY.SOLID_WALL)).toBe(true);
    expect(guardTypes.has(ENTITY.BARRICADE)).toBe(true);
    expect(shooters.some((entity) => entity.shooterKind === "still")).toBe(true);
    expect(shooters.some((entity) => entity.shooterKind === "walker")).toBe(true);
    expect(pickups.length).toBeGreaterThanOrEqual(4);
    expect(getSmallestGap([...pickups, ...weaponPickups])).toBeGreaterThanOrEqual(8);
    expect(pickups.every((pickup) => pickup.health === 1 && pickup.maxHealth === 1)).toBe(true);
    expect(weaponPickups.length).toBeGreaterThanOrEqual(1);
    expect(catchTime).toBeLessThanOrEqual(plan.profile.targetDuration * 0.85);
  });

  it("scatters checkpoint objects across the whole runway before the boss", () => {
    [30, 50, 100, 150, 200].forEach((level) => {
      const plan = createRoundPlan(level, level * 100 + 1);
      const boss = plan.entities.find((entity) => entity.type === ENTITY.BOSS);
      const bands = countPreBossBands(plan.entities, boss.z);
      const maxGap = getLargestPreBossGap(plan.entities, boss.z);

      expect(bands.every((count) => count > 0)).toBe(true);
      expect(maxGap).toBeLessThanOrEqual(getAllowedCheckpointGap(level));
    });
  });

  it("hardens boss stats as checkpoint levels climb", () => {
    const early = createRoundPlan(10, 1010).entities.find((entity) => entity.type === ENTITY.BOSS);
    const late = createRoundPlan(100, 10100).entities.find((entity) => entity.type === ENTITY.BOSS);
    const elite = createRoundPlan(200, 10200).entities.find((entity) => entity.type === ENTITY.BOSS);

    expect(late.health).toBeGreaterThan(early.health);
    expect(elite.health).toBeGreaterThan(late.health);
    expect(late.value).toBeGreaterThan(early.value);
    expect(elite.penalty).toBeGreaterThan(late.penalty);
    expect(elite.projectileSpeed).toBeGreaterThan(late.projectileSpeed);
  });

  it("adds more ammo support pickups for high burn weapons", () => {
    const pistol = createRoundPlan(25, 2525, "en", "pistol");
    const machineGun = createRoundPlan(25, 2525, "en", "machineGun");

    expect(countAmmoPickups(machineGun)).toBeGreaterThan(countAmmoPickups(pistol));
    expect(getSmallestGap(machineGun.entities.filter((entity) => entity.type === ENTITY.PICKUP || entity.type === ENTITY.WEAPON_PICKUP))).toBeGreaterThanOrEqual(8);
  });

  it("localizes generated labels", () => {
    const plan = createRoundPlan(7, 777, "pt-BR");

    expect(plan.entities.some((entity) => entity.label === "Bloqueio de upgrade")).toBe(true);
  });

  it("keeps soldier and double-gun buff gates rare", () => {
    const earlyBuffs = getBuffStats([createRoundPlan(6, 1234)]);
    const latePlans = Array.from({ length: 40 }, (_, index) => createRoundPlan(24, 9000 + index));
    const lateBuffs = getBuffStats(latePlans);
    const rareCount = lateBuffs.filter((stat) => ["soldiers", "doubleWeapon"].includes(stat)).length;
    const largestDoubleCount = Math.max(...latePlans.map((plan) => getBuffStats([plan]).filter((stat) => stat === "doubleWeapon").length));

    expect(earlyBuffs).not.toContain("soldiers");
    expect(earlyBuffs).not.toContain("doubleWeapon");
    expect(earlyBuffs).not.toContain("soldierTraining");
    expect(largestDoubleCount).toBeLessThanOrEqual(1);
    expect(lateBuffs).toContain("soldierTraining");
    expect(rareCount).toBeGreaterThan(0);
    expect(rareCount / lateBuffs.length).toBeLessThan(0.25);
  });
});

function getBuffStats(plans) {
  return plans
    .flatMap((plan) => plan.entities)
    .filter((entity) => entity.type === ENTITY.GATE && entity.gateType === "buff")
    .map((entity) => entity.stat);
}

function averageCount(plans, predicate) {
  return plans.reduce((total, plan) => total + plan.entities.filter(predicate).length, 0) / plans.length;
}

function countAmmoPickups(plan) {
  return plan.entities.filter((entity) => entity.type === ENTITY.PICKUP && entity.stat === "ammo").length;
}

function getHostiles(plan) {
  return plan.entities.filter((entity) => entity.type === ENTITY.ENEMY || entity.type === ENTITY.SHOOTER || entity.type === ENTITY.BOSS);
}

function isBehindSameLane(wall, unit) {
  return unit.z > wall.z && Math.abs(wall.x - unit.x) < (wall.width + unit.width) * 0.5;
}

function countRunwaySections(targets, trackLength) {
  return targets.reduce(
    (sections, entity) => {
      const index = Math.min(2, Math.floor((entity.z / trackLength) * 3));
      sections[Math.max(0, index)] += 1;
      return sections;
    },
    [0, 0, 0],
  );
}

function countPreBossBands(entities, bossZ) {
  return getPreBossObjects(entities, bossZ).reduce(
    (bands, entity) => {
      const index = Math.min(4, Math.floor(((entity.z - 12) / (bossZ - 12)) * 5));
      bands[Math.max(0, index)] += 1;
      return bands;
    },
    [0, 0, 0, 0, 0],
  );
}

function getLargestPreBossGap(entities, bossZ) {
  const positions = getPreBossObjects(entities, bossZ).map((entity) => entity.z).sort((a, b) => a - b);
  return [...positions, bossZ].reduce(
    (largest, z, index, list) => Math.max(largest, z - (index ? list[index - 1] : 12)),
    0,
  );
}

function getPreBossObjects(entities, bossZ) {
  const types = new Set([ENTITY.GATE, ENTITY.PICKUP, ENTITY.WEAPON_PICKUP, ENTITY.ENEMY, ENTITY.SHOOTER, ENTITY.SOLID_WALL, ENTITY.BARRICADE, ENTITY.RECRUITER]);
  return entities.filter((entity) => types.has(entity.type) && entity.z < bossZ);
}

function getAllowedCheckpointGap(level) {
  if (level <= 35) return 18;
  if (level <= 100) return 25;
  return 30;
}

function getSmallestGap(entities) {
  const positions = entities.map((entity) => entity.z).sort((a, b) => a - b);
  return positions.slice(1).reduce((smallest, z, index) => Math.min(smallest, z - positions[index]), Infinity);
}
