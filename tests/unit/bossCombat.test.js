import { describe, expect, it } from "vitest";
import { getBossDamageMultiplier, isBossBlocking, recordBossDamage, updateBossCombat } from "../../src/game/simulation/bossCombat.js";

describe("boss combat", () => {
  it("emits delayed multi-shot salvos for specialist patterns", () => {
    const boss = createBoss({ shotPattern: "triple", skillTier: 3, shootCooldown: 0, skillCooldown: 99 });
    const shots = [];
    const run = createRun();

    updateBossCombat(run, boss, 0, (_run, _boss, shot) => shots.push(shot));
    updateBossCombat(run, boss, 0.15, (_run, _boss, shot) => shots.push(shot));
    updateBossCombat(run, boss, 0.15, (_run, _boss, shot) => shots.push(shot));

    expect(shots).toHaveLength(3);
    expect(new Set(shots.map((shot) => shot.aimOffset)).size).toBe(3);
  });

  it("heals only when its channel is not interrupted by damage", () => {
    const run = createRun();
    const healed = createBoss({ health: 50, skillState: "healing", skillTimer: 0.1 });
    updateBossCombat(run, healed, 0.2, () => {});
    expect(healed.health).toBe(58);

    const interrupted = createBoss({ health: 50, skillState: "healing", skillTimer: 0.1 });
    recordBossDamage(run, interrupted);
    updateBossCombat(run, interrupted, 0.2, () => {});
    expect(interrupted.health).toBe(50);
  });

  it("exposes active block windows for projectile interception", () => {
    expect(isBossBlocking(createBoss({ skillState: "blocking", skillTimer: 1 }))).toBe(true);
    expect(isBossBlocking(createBoss({ skillState: "blocking", skillTimer: 0 }))).toBe(false);
  });

  it("executes each specialist signature as an observable combat state", () => {
    const run = createRun();
    const sidestep = createBoss({ signatureSkill: "sidestep", skillCooldown: 0, x: 1 });
    updateBossCombat(run, sidestep, 0, () => {});
    expect(sidestep.skillState).toBe("sidestepping");
    expect(sidestep.sidestepTargetX).toBeLessThan(0);

    const armor = createBoss({ signatureSkill: "armor", skillCooldown: 0 });
    updateBossCombat(run, armor, 0, () => {});
    expect(armor.skillState).toBe("armoring");
    expect(getBossDamageMultiplier(armor)).toBeLessThan(1);

    const sweepShots = [];
    const sweep = createBoss({ signatureSkill: "laneSweep", skillCooldown: 0, skillTier: 3 });
    updateBossCombat(run, sweep, 0, (_run, _boss, shot) => sweepShots.push(shot));
    for (let index = 0; index < 8; index += 1) updateBossCombat(run, sweep, 0.22, (_run, _boss, shot) => sweepShots.push(shot));
    expect(sweepShots.length).toBeGreaterThanOrEqual(7);
    expect(Math.min(...sweepShots.map((shot) => shot.aimOffset))).toBeLessThan(0);
    expect(Math.max(...sweepShots.map((shot) => shot.aimOffset))).toBeGreaterThan(0);
  });
});

function createBoss(changes = {}) {
  return { id: 4, type: "boss", z: 12, health: 100, maxHealth: 100, shootInterval: 2, shootCooldown: 1, skillCooldown: 1, skillTier: 1, ...changes };
}

function createRun() {
  return { elapsed: 20, messages: [] };
}
