import { describe, expect, it } from "vitest";
import { createUpgradeLevels } from "../../src/game/content/upgrades.js";
import { buildStats } from "../../src/game/simulation/stats.js";

describe("buildStats", () => {
  it("scales core combat stats from persistent upgrades", () => {
    const upgrades = createUpgradeLevels();
    upgrades.fireRate = 4;
    upgrades.range = 3;
    upgrades.ammo = 2;
    upgrades.power = 5;
    upgrades.doubleWeapon = 1;
    upgrades.assistants = 2;

    const stats = buildStats(upgrades);

    expect(stats.fireRate).toBeGreaterThan(3);
    expect(stats.range).toBeGreaterThan(14);
    expect(stats.ammo).toBeGreaterThan(80);
    expect(stats.power).toBeGreaterThan(12);
    expect(stats.projectileCount).toBe(2);
    expect(stats.assistants).toBe(2);
  });

  it("keeps debuffs inside playable lower bounds", () => {
    const stats = buildStats(createUpgradeLevels(), {
      fireRate: -99,
      range: -99,
      power: -99,
      income: -99,
    });

    expect(stats.fireRate).toBe(0.8);
    expect(stats.range).toBe(5);
    expect(stats.power).toBe(1);
    expect(stats.incomeMultiplier).toBe(0.5);
  });

  it("applies weapon identity tradeoffs", () => {
    const upgrades = createUpgradeLevels();
    const pistol = buildStats(upgrades, {}, "pistol");
    const shotgun = buildStats(upgrades, {}, "shotgun");
    const machineGun = buildStats(upgrades, {}, "machineGun");
    const rifle = buildStats(upgrades, {}, "rifle");

    expect(pistol.fireRate).toBeGreaterThan(shotgun.fireRate);
    expect(shotgun.power).toBeGreaterThan(pistol.power);
    expect(machineGun.fireRate).toBeGreaterThan(pistol.fireRate);
    expect(machineGun.power).toBeLessThan(pistol.power);
    expect(rifle.range).toBeGreaterThan(pistol.range);
  });
});
