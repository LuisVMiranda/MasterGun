import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { WEAPON_DEFINITIONS } from "../../src/game/content/weapons.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";
import { buildStats } from "../../src/game/simulation/stats.js";

const LAYOUT_TYPES = new Set([
  ENTITY.GATE,
  ENTITY.ENEMY,
  ENTITY.BARRICADE,
  ENTITY.HAZARD,
  ENTITY.PICKUP,
  ENTITY.SOLID_WALL,
  ENTITY.SHOOTER,
  ENTITY.WEAPON_PICKUP,
  ENTITY.RECRUITER,
]);
const LANE_VARIATION_TYPES = new Set([ENTITY.ENEMY, ENTITY.SHOOTER, ENTITY.BARRICADE, ENTITY.SOLID_WALL]);

describe("round balance audit", () => {
  it("funds continuous fire plus a reserve for every weapon across all 200 levels", () => {
    WEAPON_DEFINITIONS.forEach((weapon) => {
      range(1, 200).forEach((level) => assertAmmoCoverage(level, weapon.id));
    });
  });

  it("uses the whole playable runway without overloaded bands", () => {
    range(1, 200).forEach((level) => {
      [17, 89, 233].forEach((seed) => assertRunwayDistribution(level, seed));
    });
  });

  it("avoids obvious repeated hostile lane patterns", () => {
    range(1, 200).forEach((level) => {
      const plan = createRoundPlan(level, level * 4099 + 31);
      const hostiles = plan.entities.filter((entity) => LANE_VARIATION_TYPES.has(entity.type)).sort(sortByZ);
      expect(getLongestLaneRepeat(hostiles), `level ${level}`).toBeLessThanOrEqual(2);
    });
  });
});

function assertAmmoCoverage(level, weaponId) {
  const stats = buildStats({}, {}, weaponId);
  const plan = createRoundPlan(level, level * 7919, "en", weaponId, stats);
  const support = plan.entities
    .filter((entity) => entity.type === ENTITY.PICKUP && entity.stat === "ammo")
    .reduce((total, entity) => total + (entity.ammoCap ?? 0), 0);
  const required = Math.ceil(stats.fireRate * plan.profile.targetDuration * 1.08);

  expect(stats.ammo + support, `${weaponId} level ${level}`).toBeGreaterThanOrEqual(required);
}

function assertRunwayDistribution(level, seed) {
  const plan = createRoundPlan(level, level * 997 + seed);
  const boss = plan.entities.find((entity) => entity.type === ENTITY.BOSS);
  const endZ = boss?.z ?? plan.profile.trackLength - 24;
  const entities = plan.entities.filter((entity) => LAYOUT_TYPES.has(entity.type) && entity.z < endZ);
  const bands = countBands(entities, endZ);
  const average = entities.length / bands.length;

  expect(bands.every((count) => count > 0), `empty band at level ${level}`).toBe(true);
  expect(Math.max(...bands), `clustered level ${level}: ${bands}`).toBeLessThanOrEqual(Math.ceil(average * 1.65));
}

function countBands(entities, endZ) {
  return entities.reduce((bands, entity) => {
    const progress = (entity.z - 12) / Math.max(1, endZ - 12);
    const index = Math.min(4, Math.max(0, Math.floor(progress * 5)));
    bands[index] += 1;
    return bands;
  }, [0, 0, 0, 0, 0]);
}

function getLongestLaneRepeat(entities) {
  let longest = 0;
  let current = 0;
  let previousLane = null;

  entities.forEach((entity) => {
    const lane = Math.round(entity.x / 1.1);
    current = lane === previousLane ? current + 1 : 1;
    previousLane = lane;
    longest = Math.max(longest, current);
  });
  return longest;
}

function sortByZ(first, second) {
  return first.z - second.z || first.id - second.id;
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
