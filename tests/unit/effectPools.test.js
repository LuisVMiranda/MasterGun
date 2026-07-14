import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";

const TIMED_DEBUFFS = new Set(["thinProjectile", "forceReload", "forceSoldierReload"]);
const TIMED_BUFFS = new Set(["specialShot", "noAmmoConsumption"]);

describe("timed pickup distribution", () => {
  it("makes ammo reduction uncommon and includes timed alternatives", () => {
    const plans = Array.from({ length: 40 }, (_, index) => createRoundPlan(80, 9000 + index));
    const redAssets = plans.flatMap((plan) => plan.entities.filter(isRedAsset));
    const ammoLosses = redAssets.filter((entity) => entity.stat === "ammo");
    const timed = redAssets.filter((entity) => TIMED_DEBUFFS.has(entity.stat));

    expect(ammoLosses.length / redAssets.length).toBeLessThan(0.25);
    expect(timed.length).toBeGreaterThan(ammoLosses.length);
    expect(plans.every((plan) => plan.entities.filter((entity) => isRedAsset(entity) && entity.stat === "ammo").length <= 1)).toBe(true);
  });

  it("places both temporary green buffs in projected mid-game runs", () => {
    const plans = Array.from({ length: 50 }, (_, index) => createRoundPlan(90, 12000 + index));
    const buffs = new Set(plans.flatMap((plan) => plan.entities
      .filter((entity) => entity.type === ENTITY.GATE && entity.gateType === "buff")
      .map((entity) => entity.stat)));

    expect([...TIMED_BUFFS].every((effect) => buffs.has(effect))).toBe(true);
  });
});

function isRedAsset(entity) {
  return entity.type === ENTITY.HAZARD || (entity.type === ENTITY.GATE && entity.gateType === "debuff");
}
