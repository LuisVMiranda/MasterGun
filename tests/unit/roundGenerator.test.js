import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { LEVEL_PROFILES } from "../../src/game/content/levelProfiles.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";

describe("createRoundPlan", () => {
  it("creates repeatable rounds from the same seed", () => {
    const first = createRoundPlan(10, 1234);
    const second = createRoundPlan(10, 1234);

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

  it("projects at least 30 distinct levels with growing pressure", () => {
    const first = LEVEL_PROFILES[0];
    const last = LEVEL_PROFILES[29];
    const lengths = LEVEL_PROFILES.map((profile) => profile.trackLength);

    expect(LEVEL_PROFILES).toHaveLength(30);
    expect(last.trackLength).toBeGreaterThan(first.trackLength);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(250);
    expect(last.shooters + last.walkers + last.walls).toBeGreaterThan(first.shooters + first.walkers + first.walls);
    expect(last.baseReward / last.difficulty).toBeLessThan(100);
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
