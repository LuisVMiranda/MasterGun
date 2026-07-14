import { describe, expect, it } from "vitest";
import { TRACK } from "../../src/game/content/constants.js";
import { RUNWAY_GEOMETRY } from "../../src/render/objects/world.js";

describe("runway geometry", () => {
  it("overlaps the dark rails with the runway without lateral or vertical gaps", () => {
    const railX = TRACK.halfWidth + RUNWAY_GEOMETRY.railWidth / 2 - RUNWAY_GEOMETRY.railOverlap;
    const innerRailEdge = railX - RUNWAY_GEOMETRY.railWidth / 2;
    const railBottom = RUNWAY_GEOMETRY.railY - RUNWAY_GEOMETRY.railHeight / 2;
    const runwayTop = -0.12 + 0.16 / 2;

    expect(innerRailEdge).toBeLessThan(TRACK.halfWidth);
    expect(railBottom).toBeLessThanOrEqual(runwayTop);
    expect(RUNWAY_GEOMETRY.tileDepthScale).toBeGreaterThan(1);
  });
});
