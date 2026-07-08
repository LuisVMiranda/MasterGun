import { describe, expect, it } from "vitest";
import { ENTITY, LANES, TARGET_SCALE } from "../../src/game/content/constants.js";
import { LEVEL_PROFILES, getTargetDurationSeconds } from "../../src/game/content/levelProfiles.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";
import { getLevelProfile } from "../../src/game/simulation/progression.js";

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
    [1, 40, 120, 200].forEach((level) => {
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

  it("adds checkpoint challenge pickups and a catchable boss every five levels", () => {
    const plan = createRoundPlan(10, 321);
    const boss = plan.entities.find((entity) => entity.type === ENTITY.BOSS);
    const pickups = plan.entities.filter((entity) => entity.type === ENTITY.PICKUP);
    const weaponPickups = plan.entities.filter((entity) => entity.type === ENTITY.WEAPON_PICKUP);
    const catchTime = boss.z / (plan.profile.speed - boss.retreatSpeed);

    expect(plan.profile.challenge).toBe(true);
    expect(pickups.length).toBeGreaterThanOrEqual(5);
    expect(weaponPickups.length).toBeGreaterThanOrEqual(1);
    expect(catchTime).toBeLessThanOrEqual(15);
  });

  it("localizes generated labels", () => {
    const plan = createRoundPlan(7, 777, "pt-BR");

    expect(plan.entities.some((entity) => entity.label === "Bloqueio de upgrade")).toBe(true);
  });

  it("keeps assistant and double-gun buff gates rare", () => {
    const earlyBuffs = getBuffStats([createRoundPlan(6, 1234)]);
    const latePlans = Array.from({ length: 40 }, (_, index) => createRoundPlan(24, 9000 + index));
    const lateBuffs = getBuffStats(latePlans);
    const rareCount = lateBuffs.filter((stat) => ["assistants", "doubleWeapon"].includes(stat)).length;

    expect(earlyBuffs).not.toContain("assistants");
    expect(earlyBuffs).not.toContain("doubleWeapon");
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
