import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { GAME_MODE } from "../../src/game/content/modes.js";
import { MASTERY_TRIALS } from "../../src/game/content/masteryTrials.js";
import { BOSS_RUSH_FIGHTS } from "../../src/game/content/bossRush.js";
import { getEndlessSectorProfile } from "../../src/game/content/endless.js";
import { createWeeklyChallenge } from "../../src/game/content/weeklyChallenge.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState, enterMode, setModeSelection, startRun } from "../../src/game/simulation/runState.js";

describe("alternate mode property batches", () => {
  it("generates every mastery trial with valid weapon-locked targets", () => {
    MASTERY_TRIALS.forEach((trial) => {
      let state = createModeState(GAME_MODE.WEAPON_MASTERY);
      state = setModeSelection(state, "masteryWeapon", trial.weaponId);
      unlockPreviousMastery(state, trial);
      state = setModeSelection(state, "masteryTrial", trial.number);
      const run = startRun(state, 7000 + trial.number).run;

      expect(run.weaponId).toBe(trial.weaponId);
      expect(run.entities.some((entity) => entity.type === ENTITY.WEAPON_PICKUP)).toBe(false);
      expect(run.profile.targetDuration).toBe(trial.duration);
      assertValidEntities(run.entities);
    });
  });

  it("generates all Boss Rush fights with one final configured boss", () => {
    BOSS_RUSH_FIGHTS.forEach((fight) => {
      let state = createModeState(GAME_MODE.BOSS_RUSH);
      unlockPreviousBoss(state, fight);
      state = setModeSelection(state, "bossFight", fight.number);
      const run = startRun(state, 9000 + fight.number).run;
      const bosses = run.entities.filter((entity) => entity.type === ENTITY.BOSS);
      const boss = bosses[0];

      expect(bosses).toHaveLength(1);
      expect(run.modeContext.fight.number).toBe(fight.number);
      expect(run.entities.every((entity) => entity.id === boss.id || entity.z < boss.z)).toBe(true);
      expect(boss.health).toBeGreaterThan(0);
      expect(boss.projectileColor).toMatch(/^#/);
      assertValidEntities(run.entities);
    });
  });

  it("keeps 52 UTC weekly seeds deterministic across all difficulties", () => {
    const start = Date.UTC(2026, 0, 5);
    for (let week = 0; week < 52; week += 1) {
      const now = start + week * 7 * 86400000;
      const easy = createWeeklyChallenge("easy", 120, now);
      const medium = createWeeklyChallenge("medium", 120, now);
      const hard = createWeeklyChallenge("hard", 120, now);
      expect(new Set([easy.weekKey, medium.weekKey, hard.weekKey]).size).toBe(1);
      expect(easy.weaponId).toBe(hard.weaponId);
      expect(easy.reward).toBeLessThan(medium.reward);
      expect(medium.reward).toBeLessThan(hard.reward);
    }
  });

  it("scales the first hundred Endless sectors within active-entity limits", () => {
    for (let sector = 1; sector <= 100; sector += 1) {
      const profile = getEndlessSectorProfile(sector);
      expect(profile.healthScale).toBeGreaterThanOrEqual(1);
      expect(profile.duration).toBeLessThanOrEqual(120);
      expect(profile.densityScale).toBeLessThanOrEqual(1.75);
      expect(profile.boss).toBe(sector % 5 === 0);
    }
  });
});

function createModeState(mode) {
  const save = createDefaultSave();
  save.level = 200;
  save.weaponsOwned = ["pistol", "shotgun", "machineGun", "rifle"];
  save.modeProgress.arcade.highestCleared = 200;
  return enterMode(createAppState(save), mode);
}

function assertValidEntities(entities) {
  expect(entities.length).toBeGreaterThan(0);
  expect(entities.length).toBeLessThan(220);
  entities.forEach((entity) => {
    expect(entity.id).toBeGreaterThan(0);
    expect(Number.isFinite(entity.x)).toBe(true);
    expect(Number.isFinite(entity.z)).toBe(true);
    if (entity.maxHealth) expect(entity.maxHealth).toBeGreaterThan(0);
  });
}

function unlockPreviousMastery(state, trial) {
  if (trial.number > 1) state.save.modeProgress.mastery[trial.weaponId].medals[trial.number - 1] = 1;
}

function unlockPreviousBoss(state, fight) {
  if (fight.number > 1) state.save.modeProgress.bossRush.medals[fight.number - 1] = 1;
}
