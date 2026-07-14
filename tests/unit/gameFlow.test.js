import { describe, expect, it } from "vitest";
import { PHASE } from "../../src/game/content/constants.js";
import { completeRun, continueRunVictory, failRun } from "../../src/game/simulation/gameFlow.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";

describe("run settlement", () => {
  it("banks collected money only after a successful run", () => {
    const failedRun = createRunWithCash(701, 240);
    const successfulRun = createRunWithCash(702, 240);
    const startingCash = failedRun.save.cash;

    const failed = failRun(failedRun);
    const completed = completeRun(successfulRun);

    expect(failed.save.cash).toBe(startingCash);
    expect(failed.save.level).toBe(1);
    expect(failed.lastSummary.reward).toBe(0);
    expect(completed.save.cash).toBeGreaterThan(startingCash);
    expect(completed.save.level).toBe(2);
  });

  it("rebuilds every transient system when retrying a failed level", () => {
    const state = createRunWithCash(703, 90);
    state.run.player.life = 1;
    state.run.player.ammo = 0;
    state.run.soldiers = [{ id: 1, health: 1 }];
    state.run.bullets = [{ id: 2 }];
    state.run.enemyProjectiles = [{ id: 3 }];
    state.run.effects = { thinProjectile: { remaining: 3 } };
    state.run.modifiers = { power: -9 };
    state.run.entities[0].health = 1;

    const retried = startRun(failRun(state), 704);

    expect(retried.run.player.ammo).toBe(retried.run.stats.ammo);
    expect(retried.run.player.life).toBe(Math.max(0, Math.round(retried.run.stats.baseLife)));
    expect(retried.run.soldiers).toEqual([]);
    expect(retried.run.bullets).toEqual([]);
    expect(retried.run.enemyProjectiles).toEqual([]);
    expect(retried.run.effects).toEqual({});
    expect(retried.run.modifiers).toEqual({});
    expect(retried.run.entities.every((entity) => entity.health === undefined || entity.health === entity.maxHealth)).toBe(true);
  });

  it("opens the shop only after the victory prompt is continued", () => {
    const victory = completeRun(createRunWithCash(705, 40));
    const shop = continueRunVictory(victory);

    expect(victory.phase).toBe(PHASE.VICTORY);
    expect(shop.phase).toBe(PHASE.SHOP);
    expect(shop.lastSummary).toBe(victory.lastSummary);
  });

});

function createRunWithCash(seed, collected) {
  const save = createDefaultSave();
  save.cash = 500;
  const state = startRun(createAppState(save), seed);
  state.run.destroyedValue = collected;
  state.run.finishTier = 1;
  state.run.player.life = state.run.player.maxLife;
  return state;
}
