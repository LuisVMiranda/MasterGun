import { describe, expect, it } from "vitest";
import { FOURTH_UPGRADE_SLOT_MISSION_ID, MASTER_MISSION_ID, MISSION_DEFINITIONS, THIRD_UPGRADE_SLOT_MISSION_ID } from "../../src/game/content/achievements.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createMissionStats, getMissionCards, markGameWonSeen, refreshMissionProgress } from "../../src/game/simulation/achievements.js";

describe("achievements", () => {
  it("defines long-tail missions and completes the champion mission last", () => {
    const save = {
      ...createDefaultSave(),
      missionStats: createCompletedStats(),
    };

    const progressed = refreshMissionProgress(save);

    expect(MISSION_DEFINITIONS).toHaveLength(66);
    expect(progressed.achievements.completedIds).toHaveLength(66);
    expect(progressed.achievements.completedIds.at(-1)).toBe(MASTER_MISSION_ID);
    expect(progressed.achievements.gameWon).toBe(true);
    expect(progressed.achievements.gameWonSeen).toBe(false);
    expect(markGameWonSeen(progressed).achievements.gameWonSeen).toBe(true);
  });

  it("unlocks extra shop slots through late level achievements", () => {
    const save = createDefaultSave();
    save.level = 80;
    const thirdSlot = refreshMissionProgress(save);
    thirdSlot.level = 140;
    const fourthSlot = refreshMissionProgress(thirdSlot);

    expect(thirdSlot.achievements.completedIds).toContain(THIRD_UPGRADE_SLOT_MISSION_ID);
    expect(thirdSlot.achievements.completedIds).not.toContain(FOURTH_UPGRADE_SLOT_MISSION_ID);
    expect(fourthSlot.achievements.completedIds).toContain(FOURTH_UPGRADE_SLOT_MISSION_ID);
  });

  it("keeps mission progress below completion until the required stat reaches target", () => {
    const save = createDefaultSave();
    save.missionStats.cashDrops = 149;

    const progressed = refreshMissionProgress(save);

    expect(progressed.achievements.completedIds).toContain("pocketMoney");
    expect(progressed.achievements.completedIds).not.toContain("cashMagnet");
    expect(progressed.achievements.gameWon).toBe(false);
  });

  it("shows Heavy Hitter progress as a whole number", () => {
    const save = createDefaultSave();
    save.missionStats.damageDealt = 123.6;

    const heavyHitter = getMissionCards(save).find((mission) => mission.id === "heavyHitter");

    expect(heavyHitter.progress).toBe(124);
    expect(Number.isInteger(heavyHitter.progress)).toBe(true);
  });
});

function createCompletedStats() {
  const stats = createMissionStats();
  MISSION_DEFINITIONS.filter((mission) => mission.id !== MASTER_MISSION_ID).forEach((mission) => {
    stats[mission.stat] = Math.max(stats[mission.stat] ?? 0, mission.target);
  });
  return stats;
}
