import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { applyAmmoGain, updateAmmoGain } from "../../src/game/simulation/ammoGain.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { updateRunState } from "../../src/game/simulation/updateRun.js";

const idleInput = { axisX: 0, pointerActive: false, pointerX: 0 };

describe("ammo gain feedback", () => {
  it("tracks a short-lived visible gain while adding ammo", () => {
    const run = { player: { ammo: 3 } };

    applyAmmoGain(run, 8);
    applyAmmoGain(run, 4);

    expect(run.player.ammo).toBe(15);
    expect(run.player.ammoGain.value).toBe(12);
    expect(run.player.ammoGain.ttl).toBeGreaterThan(1);

    updateAmmoGain(run, 1.2);
    expect(run.player.ammoGain).toBeUndefined();
  });

  it("shows proportional ammo bank gains even while shots continue firing", () => {
    const state = startRun(createAppState(createDefaultSave()), 192);
    state.run.player.shotTimer = 999;
    state.run.player.ammo = 0;
    state.run.entities = [createAmmoPickup({ health: 10, ammoCap: 20, z: 3 })];
    state.run.bullets = [createPlayerBullet(910, { damage: 5, z: 2.5 })];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.player.ammo).toBe(10);
    expect(state.run.player.ammoGain.value).toBe(10);
    expect(state.run.entities[0].ammoEarned).toBe(10);
  });

  it("keeps the pickup gain explicit when auto-fire spends ammo in the same tick", () => {
    const state = startRun(createAppState(createDefaultSave()), 193);
    state.run.player.ammo = 4;
    state.run.entities = [createLooseAmmoPickup()];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.player.ammo).toBe(15);
    expect(state.run.player.ammoGain.value).toBe(12);
    expect(state.run.player.recoilTimer).toBe(0);
  });
});

function createAmmoPickup(options = {}) {
  const health = options.health ?? 12;
  const ammoCap = options.ammoCap ?? 18;
  return {
    id: 104,
    type: ENTITY.PICKUP,
    x: 0,
    z: options.z ?? 0,
    width: 1,
    depth: 1,
    stat: "ammo",
    value: ammoCap,
    label: `Ammo +${ammoCap}`,
    health,
    maxHealth: health,
    ammoCap,
    ammoEarned: 0,
    active: true,
    collected: false,
  };
}

function createLooseAmmoPickup() {
  return {
    id: 105,
    type: ENTITY.PICKUP,
    x: 0,
    z: 0,
    width: 1,
    depth: 1,
    stat: "ammo",
    value: 12,
    label: "Ammo +12",
    health: 1,
    maxHealth: 1,
    active: true,
    collected: false,
  };
}

function createPlayerBullet(id, options = {}) {
  return {
    id,
    x: options.x ?? 0,
    z: options.z ?? 0.8,
    width: 0.2,
    depth: 0.2,
    damage: options.damage ?? 8,
    remainingRange: options.remainingRange ?? 10,
    active: true,
  };
}
