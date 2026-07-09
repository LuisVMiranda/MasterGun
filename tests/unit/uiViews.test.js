import { describe, expect, it } from "vitest";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState } from "../../src/game/simulation/runState.js";
import { renderMissions } from "../../src/ui/missionViews.js";

describe("ui views", () => {
  it("filters missions between all, incomplete, and complete lists", () => {
    const save = createDefaultSave();
    save.achievements.completedIds = ["firstSortie"];
    const all = renderMissions(createState(save, "all"), "en");
    const complete = renderMissions(createState(save, "complete"), "en");
    const incomplete = renderMissions(createState(save, "incomplete"), "en");

    expect(all).toContain("First Sortie");
    expect(all).toContain("Pocket Money");
    expect(complete).toContain("First Sortie");
    expect(complete).not.toContain("Pocket Money");
    expect(incomplete).not.toContain("First Sortie");
    expect(incomplete).toContain("Pocket Money");
  });
});

function createState(save, missionFilter) {
  const state = createAppState(save);
  return { ...state, ui: { ...state.ui, missionFilter, missionsOpen: true } };
}
