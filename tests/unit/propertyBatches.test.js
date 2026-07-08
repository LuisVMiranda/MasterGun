import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { getShopOffers } from "../../src/game/content/shop.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";
import { calculateLiveScore } from "../../src/game/simulation/scoring.js";

describe("property batches", () => {
  it("generates valid entities across levels and seeds", () => {
    planCases().forEach(([level, seed]) => assertValidPlan(createRoundPlan(level, seed)));
  });

  it("keeps checkpoint cadence exclusive to every fifth level", () => {
    range(1, 30).forEach(assertCheckpointCadence);
  });

  it("keeps live score non-negative under broad penalty values", () => {
    [0, 10, 75, 300, 900].forEach(assertNonNegativeScore);
  });

  it("returns two unique shop offers for advanced profiles", () => {
    range(1, 40).forEach(assertUniqueShopOffers);
  });
});

function planCases() {
  return range(1, 30).flatMap((level) => [11, 29, 47, 83].map((seed) => [level, seed]));
}

function assertValidPlan(plan) {
  expect(plan.entities.length).toBeGreaterThan(0);
  plan.entities.forEach(assertValidEntity);
}

function assertCheckpointCadence(level) {
  const plan = createRoundPlan(level, 500 + level);
  const hasBoss = plan.entities.some((entity) => entity.type === ENTITY.BOSS);

  expect(hasBoss).toBe(level % 5 === 0);
  expect(plan.profile.challenge).toBe(level % 5 === 0);
}

function assertNonNegativeScore(penalty) {
  const score = calculateLiveScore({
    distance: 80,
    destroyedValue: 120,
    finishTier: 2,
    scorePenalty: penalty,
  });

  expect(score).toBeGreaterThanOrEqual(0);
}

function assertUniqueShopOffers(seed) {
  const save = createDefaultSave();
  save.level = 18;
  save.cash = 20000;
  const offers = getShopOffers(save, seed);
  const ids = offers.map((offer) => offer.offerId);

  expect(offers).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
}

function assertValidEntity(entity) {
  expect(entity.id).toBeGreaterThan(0);
  expect(entity.width).toBeGreaterThan(0);
  expect(entity.depth).toBeGreaterThan(0);
  expect(entity.active).toBe(true);

  if (entity.maxHealth) {
    expect(entity.health).toBeGreaterThan(0);
    expect(entity.maxHealth).toBeGreaterThanOrEqual(entity.health);
  }
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
