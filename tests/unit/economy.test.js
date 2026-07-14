import { describe, expect, it } from "vitest";
import { getOfferCost, getShopOffers, getShopSlotCount } from "../../src/game/content/shop.js";
import { getShopUpgrades } from "../../src/game/content/upgrades.js";
import { calculateRoundReward, canBuyUpgrade, createDefaultSave, getRewardBreakdown, purchaseShopOffer, purchaseUpgrade } from "../../src/game/simulation/economy.js";
import { createProfile, recordLeaderboard, selectProfile } from "../../src/game/simulation/profiles.js";

describe("economy", () => {
  it("applies income to base, combat, and finish rewards", () => {
    const reward = calculateRoundReward({
      baseReward: 100,
      destroyedValue: 45,
      finishTier: 3,
      incomeMultiplier: 1.5,
    });

    expect(reward).toBe(327);
  });

  it("caps combat conversion so dense rounds cannot inflate the economy", () => {
    const normal = getRewardBreakdown({ baseReward: 200, destroyedValue: 220, finishTier: 3 });
    const extreme = getRewardBreakdown({ baseReward: 200, destroyedValue: 20000, finishTier: 3 });

    expect(extreme.combat).toBeLessThanOrEqual(168);
    expect(extreme.subtotal).toBeLessThan(normal.subtotal * 1.25);
  });

  it("keeps a small completion payout after heavy score penalties", () => {
    const reward = calculateRoundReward({
      baseReward: 100,
      destroyedValue: 20,
      finishTier: 1,
      incomeMultiplier: 1,
      scorePenalty: 200,
    });

    expect(reward).toBe(30);
  });

  it("reduces round reward when the player finishes with lower life", () => {
    const strongFinish = calculateRoundReward({
      baseReward: 100,
      destroyedValue: 30,
      finishTier: 2,
      incomeMultiplier: 1,
      lifeRatio: 1,
    });
    const roughFinish = calculateRoundReward({
      baseReward: 100,
      destroyedValue: 30,
      finishTier: 2,
      incomeMultiplier: 1,
      lifeRatio: 0.25,
    });

    expect(roughFinish).toBeLessThan(strongFinish);
    expect(roughFinish).toBeGreaterThan(0);
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
    expect(purchaseUpgrade(save, "assistants", 12).purchased).toBe(false);
    expect(purchaseUpgrade(save, "assistantAmmo", 12).purchased).toBe(true);
    expect(purchaseUpgrade(save, "baseLife", 2).purchased).toBe(true);
    expect(purchaseUpgrade(save, "wallDamage", 8).purchased).toBe(true);
    expect(purchaseUpgrade(save, "breachDamage", 18).purchased).toBe(true);
    expect(purchaseUpgrade(save, "shieldDamage", 34).purchased).toBe(false);
    expect(purchaseUpgrade(save, "doubleWeapon", 99).purchased).toBe(false);
  });

  it("offers exactly two random unlocked upgrades in the shop", () => {
    const choices = getShopUpgrades(12, 4242);
    const ids = choices.map((upgrade) => upgrade.id);

    expect(choices).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(choices.every((upgrade) => !upgrade.locked)).toBe(true);
    expect(ids).not.toContain("assistants");
    expect(ids).not.toContain("doubleWeapon");
  });

  it("mixes persistent weapon offers into the shop", () => {
    const save = createDefaultSave();
    save.level = 8;
    save.cash = 2000;
    const offers = getShopOffers(save, 7);

    expect(offers).toHaveLength(2);
    expect(offers.some((offer) => offer.kind === "weapon" || offer.kind === "upgrade")).toBe(true);
  });

  it("adds one shop slot every 25 levels up to ten", () => {
    const expected = new Map([[1, 2], [25, 3], [50, 4], [75, 5], [100, 6], [125, 7], [150, 8], [175, 9], [200, 10], [260, 10]]);

    expected.forEach((slots, level) => {
      const save = createDefaultSave();
      save.level = level;
      expect(getShopSlotCount(save)).toBe(slots);
    });
  });

  it("balances invested, undeveloped, and affordable offers", () => {
    const save = createDefaultSave();
    save.level = 50;
    save.cash = 500;
    save.upgrades.fireRate = 5;
    save.upgrades.range = 2;
    const offers = getShopOffers(save, 991);
    const upgrades = offers.filter((offer) => offer.kind === "upgrade");
    const affordable = offers.filter((offer) => getOfferCost(offer, save) <= save.cash);

    expect(offers).toHaveLength(4);
    expect(upgrades.some((offer) => offer.level >= 2)).toBe(true);
    expect(upgrades.some((offer) => offer.level === 0)).toBe(true);
    expect(affordable.length).toBeGreaterThanOrEqual(2);
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

  it("unlocks twenty permanent diminishing Overclock levels after Arcade 200", () => {
    const save = createDefaultSave();
    save.cash = 100000000;
    save.level = 200;
    save.modeProgress.arcade.highestCleared = 200;
    save.upgrades.fireRate = 30;
    const result = purchaseUpgrade(save, "fireRate");

    expect(result.purchased).toBe(true);
    expect(result.save.upgrades.fireRate).toBe(31);
    expect(canBuyUpgrade({ ...save, modeProgress: { ...save.modeProgress, arcade: { highestCleared: 199 } } }, "fireRate")).toBe(false);
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
