import { describe, expect, it } from "vitest";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { getDisplayedStatValue } from "../../src/ui/runStats.js";

describe("live run stat display", () => {
  it("uses current ammunition rather than starting capacity", () => {
    const state = startRun(createAppState(createDefaultSave()), 801);
    state.run.player.ammo = 17;
    expect(getDisplayedStatValue(state.run, "ammo")).toBe(17);
  });
});
