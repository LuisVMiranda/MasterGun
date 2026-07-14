import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { GAME_MODE } from "../../src/game/content/modes.js";
import { buildStats } from "../../src/game/simulation/stats.js";
import { completeRun, continueRunVictory, extractEndlessOperation, failRun } from "../../src/game/simulation/gameFlow.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState, enterMode, setModeSelection, startRun } from "../../src/game/simulation/runState.js";

describe("alternate mode runs", () => {
  it("starts a normalized weapon-locked mastery trial without weapon pickups", () => {
    let state = createUnlockedState(GAME_MODE.WEAPON_MASTERY);
    state.save.upgrades.power = 30;
    state = setModeSelection(state, "masteryWeapon", "shotgun");
    state.save.modeProgress.mastery.shotgun.medals[9] = 1;
    state = setModeSelection(state, "masteryTrial", 10);
    state = startRun(state, 1010);
    const baseline = buildStats({}, {}, "shotgun");

    expect(state.run.mode).toBe(GAME_MODE.WEAPON_MASTERY);
    expect(state.run.weaponId).toBe("shotgun");
    expect(state.run.modeContext.trial.number).toBe(10);
    expect(state.run.entities.some((entity) => entity.type === ENTITY.WEAPON_PICKUP)).toBe(false);
    expect(state.run.stats.power).toBeLessThanOrEqual(baseline.power * 1.15);
  });

  it("starts one configured final boss after a distributed approach route", () => {
    let state = createUnlockedState(GAME_MODE.BOSS_RUSH);
    state.save.modeProgress.bossRush.medals[16] = 1;
    state = setModeSelection(state, "bossFight", 17);
    state = startRun(state, 1717);
    const bosses = state.run.entities.filter((entity) => entity.type === ENTITY.BOSS);
    const boss = bosses[0];

    expect(bosses).toHaveLength(1);
    expect(state.run.modeContext.fight.number).toBe(17);
    expect(boss.bossFamily).toBeTruthy();
    expect(boss.shotPattern).toBeTruthy();
    expect(state.run.entities.some((entity) => entity.type === ENTITY.WEAPON_PICKUP)).toBe(false);
    expect(state.run.entities.filter((entity) => entity.id !== boss.id).every((entity) => entity.z < boss.z)).toBe(true);
    expect(state.run.entities.some((entity) => entity.stat === "forceReload")).toBe(true);
  });

  it("spends a weekly attempt on launch and locks its fixed weapon", () => {
    let state = createUnlockedState(GAME_MODE.WEEKLY);
    state = setModeSelection(state, "weeklyDifficulty", "hard");
    state = startRun(state, 2026);

    expect(state.save.modeProgress.weekly.attemptsUsed).toBe(1);
    expect(state.run.modeContext.challenge.difficulty.id).toBe("hard");
    expect(state.run.weaponId).toBe(state.run.modeContext.challenge.weaponId);
    expect(state.run.profile.targetDuration).toBe(240);
    state.run.modeContext.challenge.modifiers.filter((modifier) => modifier !== "shieldPressure").forEach((modifier) => {
      expect(state.run.entities.some((entity) => entity.stat === modifier)).toBe(true);
    });
  });

  it("banks mastery rewards without advancing Arcade", () => {
    let state = createUnlockedState(GAME_MODE.WEAPON_MASTERY);
    state = startRun(state, 3030);
    const before = state.save.cash;
    prepareSuccessfulRun(state.run);
    state = completeRun(state);

    expect(state.save.level).toBe(200);
    expect(state.save.cash).toBeGreaterThan(before);
    expect(state.save.modeProgress.mastery.pistol.medals[1]).toBe(3);
    expect(continueRunVictory(state).phase).toBe("modeMenu");
  });

  it("pays a weekly reward only when every preview objective is met", () => {
    let success = startRun(createUnlockedState(GAME_MODE.WEEKLY), 4040);
    const reward = success.run.modeContext.challenge.reward;
    const before = success.save.cash;
    prepareSuccessfulRun(success.run);
    success.run.metrics.cashValue = success.run.modeContext.challenge.cashTarget;
    success.run.metrics.projectileHits = 100;
    success.run.metrics.shotsFired = 100;
    success.run.metrics.pickupsShot = 20;
    success = completeRun(success);

    expect(success.save.cash).toBe(before + reward);
    expect(success.save.modeProgress.weekly.completed).toBe(true);

    let failure = startRun(createUnlockedState(GAME_MODE.WEEKLY), 5050);
    const failureCash = failure.save.cash;
    failure = failRun(failure);
    expect(failure.save.cash).toBe(failureCash);
    expect(failure.save.modeProgress.weekly.activeAttempt).toBeNull();
  });

  it("keeps Endless loot unbanked until a fifth-sector extraction", () => {
    let state = createUnlockedState(GAME_MODE.ENDLESS);
    state.save.modeProgress.endless.activeOperation = { seed: 8, sector: 5, unbankedCash: 700, score: 0, startedAt: 1 };
    state = startRun(state, 6060);
    const wallet = state.save.cash;
    prepareSuccessfulRun(state.run);
    state = completeRun(state);

    expect(state.save.cash).toBe(wallet);
    expect(state.lastSummary.checkpoint).toBe(true);
    state = continueRunVictory(state);
    expect(state.phase).toBe("endlessCheckpoint");
    state = extractEndlessOperation(state);
    expect(state.save.cash).toBeGreaterThan(wallet + 700);
    expect(state.save.modeProgress.endless.activeOperation).toBeNull();
  });
});

function createUnlockedState(mode) {
  const save = createDefaultSave();
  save.level = 200;
  save.cash = 10000;
  save.weaponsOwned = ["pistol", "shotgun", "machineGun", "rifle"];
  save.modeProgress.arcade.highestCleared = 200;
  return enterMode(createAppState(save), mode);
}

function prepareSuccessfulRun(run) {
  run.player.life = run.player.maxLife;
  run.player.ammo = Math.max(20, run.player.ammo);
  run.metrics.collisions = 0;
  run.metrics.bossKills = 1;
  run.metrics.projectileHits = 100;
  run.metrics.shotsFired = 100;
  run.metrics.targetsDestroyed = 100;
  run.metrics.wallsDestroyed = 20;
  run.metrics.shieldKills = 20;
  run.score = 10000;
  run.distance = run.profile.trackLength;
}
