import { describe, expect, it } from "vitest";
import { BOSS_RUSH_FIGHTS } from "../../src/game/content/bossRush.js";
import { getEndlessSectorProfile, getOverclockEffectLevel, getOverclockMaxLevel } from "../../src/game/content/endless.js";
import { MASTERY_TRIALS, getMasteryTrials } from "../../src/game/content/masteryTrials.js";
import { createWeeklyChallenge, getNextWeekUtc, getUtcWeekKey } from "../../src/game/content/weeklyChallenge.js";
import { UPGRADE_DEFINITIONS } from "../../src/game/content/upgrades.js";

describe("mode content catalogs", () => {
  it("defines four distinct twenty-trial mastery campaigns", () => {
    expect(MASTERY_TRIALS).toHaveLength(80);
    ["pistol", "shotgun", "machineGun", "rifle"].forEach((weaponId) => {
      const trials = getMasteryTrials(weaponId);
      expect(trials).toHaveLength(20);
      expect(new Set(trials.map((trial) => trial.theme)).size).toBe(5);
      expect(trials.filter((trial) => trial.checkpoint)).toHaveLength(4);
    });
  });

  it("defines five boss families across five tiers", () => {
    expect(BOSS_RUSH_FIGHTS).toHaveLength(25);
    expect(new Set(BOSS_RUSH_FIGHTS.map((fight) => fight.family.id)).size).toBe(5);
    expect(new Set(BOSS_RUSH_FIGHTS.map((fight) => fight.family.projectileColor)).size).toBe(5);
    expect(BOSS_RUSH_FIGHTS.at(-1).fightSeconds).toBeGreaterThan(BOSS_RUSH_FIGHTS[0].fightSeconds);
  });

  it("builds one stable challenge per UTC week with proportional difficulty", () => {
    const monday = Date.UTC(2026, 6, 13, 4);
    const easy = createWeeklyChallenge("easy", 100, monday);
    const hard = createWeeklyChallenge("hard", 100, monday + 3 * 86400000);

    expect(getUtcWeekKey(monday)).toBe(getUtcWeekKey(monday + 3 * 86400000));
    expect(easy.weekKey).toBe(hard.weekKey);
    expect(easy.weaponId).toBe(hard.weaponId);
    expect(new Set(hard.modifiers).size).toBe(hard.modifiers.length);
    expect(hard.difficulty.duration).toBe(240);
    expect(hard.reward).toBeGreaterThan(easy.reward);
    expect(getNextWeekUtc(monday)).toBeGreaterThan(monday);
  });

  it("scales endless sectors and adds twenty diminishing Overclocks", () => {
    const first = getEndlessSectorProfile(1);
    const checkpoint = getEndlessSectorProfile(25);
    const upgrade = UPGRADE_DEFINITIONS[0];

    expect(first.boss).toBe(false);
    expect(checkpoint.boss).toBe(true);
    expect(checkpoint.healthScale).toBeGreaterThan(first.healthScale);
    expect(checkpoint.duration).toBeGreaterThan(first.duration);
    expect(getOverclockMaxLevel(upgrade)).toBe(upgrade.maxLevel + 20);
    expect(getOverclockEffectLevel(upgrade, upgrade.maxLevel + 10)).toBe(upgrade.maxLevel + 3.5);
  });
});
