import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { updateModeAmmoSupport } from "../../src/game/simulation/modeSupport.js";

describe("mode ammo support", () => {
  it("spawns one-shot ammo support when a boss weapon reserve runs low", () => {
    const run = createRun(2.4);
    updateModeAmmoSupport(run, 0.1);
    const pickup = run.entities.find((entity) => entity.type === ENTITY.PICKUP);

    expect(pickup.health).toBe(1);
    expect(pickup.ammoCap).toBeGreaterThanOrEqual(18);
    expect(run.modeContext.ammoSupportCooldown).toBe(10);
  });

  it("scales support value with high-burn weapons and keeps one active pickup", () => {
    const pistol = createRun(2.4);
    const machineGun = createRun(5.2);
    updateModeAmmoSupport(pistol, 0.1);
    updateModeAmmoSupport(machineGun, 0.1);
    const pistolValue = pistol.entities.find((entity) => entity.type === ENTITY.PICKUP).value;
    const machineValue = machineGun.entities.find((entity) => entity.type === ENTITY.PICKUP).value;
    updateModeAmmoSupport(machineGun, 20);

    expect(machineValue).toBeGreaterThan(pistolValue);
    expect(machineGun.entities.filter((entity) => entity.type === ENTITY.PICKUP)).toHaveLength(1);
  });
});

function createRun(fireRate) {
  return {
    mode: "bossRush",
    elapsed: 30,
    locale: "en",
    nextId: 10,
    stats: { fireRate, range: 14 },
    player: { ammo: 0 },
    modeContext: {},
    entities: [{ id: 1, type: ENTITY.BOSS, active: true, health: 100 }],
  };
}
