import { describe, expect, it } from "vitest";
import { getUtcWeekKey } from "../../src/game/content/weeklyChallenge.js";
import { GAME_MODE } from "../../src/game/content/modes.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { normalizeModeProgress } from "../../src/game/simulation/modeProgress.js";
import { createAppState, enterMode, setModeSelection } from "../../src/game/simulation/runState.js";
import { getPendingVictory, markVictorySeen, syncModeVictories } from "../../src/game/simulation/victoryProgress.js";
import { renderAlternateModeLobby } from "../../src/ui/modeLobbyView.js";

describe("mode progression contracts", () => {
  it("consumes a refreshed weekly attempt and resists local clock rollback", () => {
    const lastSeenUtc = Date.UTC(2026, 6, 20, 12);
    const current = {
      weekKey: getUtcWeekKey(lastSeenUtc), attemptsUsed: 2, completed: false,
      activeAttempt: { id: "attempt", startedAt: lastSeenUtc }, lastSeenUtc,
    };
    const normalized = normalizeModeProgress({ weekly: current }, 30, lastSeenUtc - 86400000);

    expect(normalized.weekly.activeAttempt).toBeNull();
    expect(normalized.weekly.attemptsUsed).toBe(2);
    expect(normalized.weekly.weekKey).toBe(getUtcWeekKey(lastSeenUtc));
    expect(normalized.weekly.lastSeenUtc).toBe(lastSeenUtc);
  });

  it("gates sequential specialist levels and renders a weekly lockout", () => {
    let mastery = enterMode(createUnlockedState(), GAME_MODE.WEAPON_MASTERY);
    expect(setModeSelection(mastery, "masteryTrial", 2)).toBe(mastery);
    mastery.save.modeProgress.mastery.pistol.medals[1] = 1;
    expect(setModeSelection(mastery, "masteryTrial", 2).modeSelection.masteryTrial).toBe(2);

    const weekly = enterMode(createUnlockedState(), GAME_MODE.WEEKLY);
    weekly.save.modeProgress.weekly.weekKey = getUtcWeekKey();
    weekly.save.modeProgress.weekly.attemptsUsed = 3;
    expect(renderAlternateModeLobby(weekly, "en")).toContain('data-testid="weekly-game-over"');
  });

  it("tracks layered crowns and acknowledges each celebration once", () => {
    const save = createUnlockedState().save;
    fillGoldMedals(save);
    const synced = syncModeVictories(save);

    expect(synced.modeProgress.victories.masteryCrown).toBe(true);
    expect(synced.modeProgress.victories.bossRushCrown).toBe(true);
    expect(synced.modeProgress.victories.legend).toBe(true);
    expect(getPendingVictory(synced)).toBe("legend");
    expect(getPendingVictory(markVictorySeen(synced, "legend"))).toBe("masteryCrown");
  });
});

function createUnlockedState() {
  const save = createDefaultSave();
  save.level = 200;
  save.weaponsOwned = ["pistol", "shotgun", "machineGun", "rifle"];
  save.modeProgress.arcade.highestCleared = 200;
  return createAppState(save);
}

function fillGoldMedals(save) {
  Object.values(save.modeProgress.mastery).forEach((campaign) => {
    for (let number = 1; number <= 20; number += 1) campaign.medals[number] = 3;
  });
  for (let number = 1; number <= 25; number += 1) save.modeProgress.bossRush.medals[number] = 3;
}
