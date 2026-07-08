import { describe, expect, it } from "vitest";
import { getShopOffers } from "../../src/game/content/shop.js";
import { getShopUpgrades } from "../../src/game/content/upgrades.js";
import { calculateRoundReward, canBuyUpgrade, createDefaultSave, purchaseShopOffer, purchaseUpgrade } from "../../src/game/simulation/economy.js";
import { createProfile, recordLeaderboard, selectProfile } from "../../src/game/simulation/profiles.js";

describe("economy", () => {
  it("applies income to base, combat, and finish rewards", () => {
    const reward = calculateRoundReward({
      baseReward: 100,
      destroyedValue: 45,
      finishTier: 3,
      incomeMultiplier: 1.5,
    });

    expect(reward).toBe(407);
  });

  it("subtracts only run score penalties before payout", () => {
    const reward = calculateRoundReward({
      baseReward: 100,
      destroyedValue: 20,
      finishTier: 1,
      incomeMultiplier: 1,
      scorePenalty: 200,
    });

    expect(reward).toBe(0);
  });

  it("spends only earned soft currency on upgrades", () => {
    const save = createDefaultSave();
    save.cash = 200;
    const result = purchaseUpgrade(save, "fireRate");

    expect(canBuyUpgrade(save, "fireRate")).toBe(true);
    expect(result.purchased).toBe(true);
    expect(result.save.cash).toBeLessThan(save.cash);
    expect(result.save.upgrades.fireRate).toBe(1);
  });

  it("blocks purchases until upgrade unlock level", () => {
    const save = createDefaultSave();
    save.cash = 10000;

    expect(purchaseUpgrade(save, "assistants", 1).purchased).toBe(false);
    expect(purchaseUpgrade(save, "assistants", 12).purchased).toBe(true);
  });

  it("offers exactly two random unlocked upgrades in the shop", () => {
    const choices = getShopUpgrades(12, 4242);
    const ids = choices.map((upgrade) => upgrade.id);

    expect(choices).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(choices.every((upgrade) => !upgrade.locked)).toBe(true);
  });

  it("mixes persistent weapon offers into the shop", () => {
    const save = createDefaultSave();
    save.level = 8;
    save.cash = 2000;
    const offers = getShopOffers(save, 7);

    expect(offers).toHaveLength(2);
    expect(offers.some((offer) => offer.kind === "weapon" || offer.kind === "upgrade")).toBe(true);
  });

  it("purchases and equips weapons through shop offers", () => {
    const save = createDefaultSave();
    save.level = 6;
    save.cash = 5000;
    const result = purchaseShopOffer(save, "weapon:machineGun");

    expect(result.purchased).toBe(true);
    expect(result.save.weaponsOwned).toContain("machineGun");
    expect(result.save.equippedWeapon).toBe("machineGun");
  });

  it("creates switchable profiles and records leaderboard scores", () => {
    const first = createDefaultSave();
    const second = createProfile(first, "Ana");
    const selected = selectProfile(second, "pilot-1");
    const scored = recordLeaderboard(selected, { level: 3, score: 420, finishTier: 2 });

    expect(second.profileName).toBe("Ana");
    expect(selected.profileName).toBe("Pilot 1");
    expect(scored.leaderboard[0].score).toBe(420);
  });
});
