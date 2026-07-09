import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { getFinishCashDrop } from "../../src/game/simulation/effects.js";

describe("effects", () => {
  it("scales finish-wall cash drop odds and value with health", () => {
    const low = getFinishCashDrop(99, createFinishBlock({ id: 1, health: 25, value: 32 }));
    const high = getFinishCashDrop(99, createFinishBlock({ id: 2, health: 240, value: 260 }));

    expect(high.chance).toBeGreaterThan(low.chance);
    expect(high.value).toBeGreaterThan(low.value);
    expect(high.chance).toBeLessThanOrEqual(0.8);
  });
});

function createFinishBlock(options) {
  return {
    id: options.id,
    type: ENTITY.FINISH_BLOCK,
    health: options.health,
    maxHealth: options.health,
    value: options.value,
  };
}
