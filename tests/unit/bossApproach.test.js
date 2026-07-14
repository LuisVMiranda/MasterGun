import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { createUpgradeLevels } from "../../src/game/content/upgrades.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";
import { buildStats } from "../../src/game/simulation/stats.js";
import { getBossApproachSeconds, tightenBossApproach } from "../../src/game/simulation/bossApproach.js";

describe("boss approach pacing", () => {
  it("caps clear-runway boss waiting to a 3-4 second engagement window", () => {
    for (let level = 5; level <= 200; level += 5) {
      const run = createBossRun(level);
      const boss = run.entities.find((entity) => entity.type === ENTITY.BOSS);
      boss.z += 120;

      tightenBossApproach(run);

      expect(getBossApproachSeconds(run, boss)).toBeGreaterThanOrEqual(3);
      expect(getBossApproachSeconds(run, boss)).toBeLessThanOrEqual(4);
    }
  });

  it("does not skip active pre-boss assets", () => {
    const run = createBossRun(50);
    const boss = run.entities.find((entity) => entity.type === ENTITY.BOSS);
    boss.z = 220;
    run.entities.push({ id: 999, type: ENTITY.ENEMY, x: 0, z: 40, width: 1, depth: 1, health: 5, active: true });

    tightenBossApproach(run);

    expect(boss.z).toBe(220);
  });
});

function createBossRun(level) {
  const plan = createRoundPlan(level, level * 97);
  return {
    profile: plan.profile,
    stats: buildStats(createUpgradeLevels()),
    entities: plan.entities.filter((entity) => entity.type === ENTITY.BOSS),
  };
}
