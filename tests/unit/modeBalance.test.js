import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { GAME_MODE } from "../../src/game/content/modes.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { ensureModeAmmoRoute } from "../../src/game/simulation/modeAmmoRoute.js";
import { createAppState, enterMode, setModeSelection, startRun } from "../../src/game/simulation/runState.js";

describe("alternate mode balance audit", () => {
  it("budgets long routes by burn rate and keeps support pickups separated", () => {
    const plan = { profile: { trackLength: 1600, targetDuration: 240 }, entities: [], nextId: 1 };
    const stats = { fireRate: 5.2, ammo: 90 };
    const result = ensureModeAmmoRoute(plan, stats, { duration: 240, intensity: 0.7, locale: "en" });
    const pickups = plan.entities.filter((entity) => entity.stat === "ammo");

    expect(result.available + result.added).toBeGreaterThanOrEqual(result.required);
    expect(pickups.length).toBeGreaterThan(10);
    expect(getMinimumGap(pickups)).toBeGreaterThanOrEqual(8);
  });

  it("makes every weekly cash target physically collectible with margin", () => {
    ["easy", "medium", "hard"].forEach((difficulty, index) => {
      let state = enterMode(createUnlockedState(), GAME_MODE.WEEKLY);
      state = setModeSelection(state, "weeklyDifficulty", difficulty);
      const run = startRun(state, 4100 + index).run;
      const cash = run.entities.filter((entity) => entity.type === ENTITY.CASH && entity.sourceType === "weekly");
      const total = cash.reduce((sum, entity) => sum + entity.value, 0);

      expect(cash).toHaveLength(12);
      expect(total).toBeGreaterThanOrEqual(run.modeContext.challenge.cashTarget * 1.25);
      expect(cash.every((entity) => entity.z < run.profile.trackLength)).toBe(true);
      expect(Math.min(...run.entities.map((entity) => entity.z)) / run.profile.speed).toBeLessThanOrEqual(2.5);
      expect(run.stats.power).toBeGreaterThan(8);
    });
  });

  it("keeps fifty escalating Endless plans finite and sufficiently supplied", () => {
    for (let sector = 1; sector <= 50; sector += 1) assertEndlessSector(sector);
  });
});

function assertEndlessSector(sector) {
  let state = enterMode(createUnlockedState(), GAME_MODE.ENDLESS);
  state.save.modeProgress.endless.activeOperation = { seed: 81, sector, unbankedCash: 0, score: 0, startedAt: 1 };
  const run = startRun(state, 8000 + sector).run;
  const support = run.entities.filter((entity) => entity.stat === "ammo" && entity.value > 0);
  const ammo = run.stats.ammo + support.reduce((sum, entity) => sum + (entity.ammoCap ?? entity.value), 0);
  const required = Math.ceil(run.stats.fireRate * run.profile.targetDuration * 0.68);
  expect(run.entities.length).toBeLessThan(220);
  expect(ammo).toBeGreaterThanOrEqual(required);
}

function getMinimumGap(entities) {
  const positions = entities.map((entity) => entity.z).sort((a, b) => a - b);
  return Math.min(...positions.slice(1).map((z, index) => z - positions[index]));
}

function createUnlockedState() {
  const save = createDefaultSave();
  save.level = 200;
  save.weaponsOwned = ["pistol", "shotgun", "machineGun", "rifle"];
  save.modeProgress.arcade.highestCleared = 200;
  return createAppState(save);
}
