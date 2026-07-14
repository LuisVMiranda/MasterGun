import { describe, expect, it } from "vitest";
import { GAME_MODE, getHighestArcadeClear, isModeUnlocked } from "../../src/game/content/modes.js";
import { loadSave } from "../../src/game/save/storage.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { enterMode, exitMode, createAppState } from "../../src/game/simulation/runState.js";
import { renderModeSelect } from "../../src/ui/modeSelectView.js";

describe("mode progression", () => {
  it("migrates schema-one saves without losing Arcade progress", () => {
    const storage = createStorage({ schemaVersion: 1, level: 76, cash: 900, upgrades: {}, weaponsOwned: ["pistol"], settings: {} });
    const save = loadSave(storage);

    expect(save.schemaVersion).toBe(2);
    expect(save.cash).toBe(900);
    expect(getHighestArcadeClear(save)).toBe(75);
    expect(save.modeProgress.mastery.pistol.medals).toEqual({});
  });

  it("unlocks alternate modes only at their Arcade clear thresholds", () => {
    const save = createDefaultSave();
    save.modeProgress.arcade.highestCleared = 99;

    expect(isModeUnlocked(save, GAME_MODE.WEEKLY)).toBe(true);
    expect(isModeUnlocked(save, GAME_MODE.WEAPON_MASTERY)).toBe(true);
    expect(isModeUnlocked(save, GAME_MODE.BOSS_RUSH)).toBe(false);
    expect(isModeUnlocked(save, GAME_MODE.ENDLESS)).toBe(false);
  });

  it("navigates between mode selection and an unlocked lobby", () => {
    const initial = createAppState(createDefaultSave());
    const arcade = enterMode(initial, GAME_MODE.ARCADE);
    const locked = enterMode(initial, GAME_MODE.ENDLESS);

    expect(arcade.phase).toBe("modeMenu");
    expect(arcade.selectedMode).toBe(GAME_MODE.ARCADE);
    expect(exitMode(arcade).phase).toBe("menu");
    expect(locked).toBe(initial);
  });

  it("renders image-backed mode choices and lock requirements", () => {
    const state = createAppState(createDefaultSave());
    const html = renderModeSelect(state, "en");

    expect(html.match(/class="mode-card /g)).toHaveLength(5);
    expect(html).toContain("/assets/modes/arcade.jpg");
    expect(html).toContain("Clear Arcade level 200");
  });
});

function createStorage(value) {
  return {
    getItem: () => JSON.stringify(value),
    setItem() {},
  };
}
