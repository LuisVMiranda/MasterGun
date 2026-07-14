import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";
import { canCollectEntity, canDamageEntity, isBlockingEntity } from "../../src/game/simulation/entityInteractions.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { updateRunState } from "../../src/game/simulation/updateRun.js";

const idleInput = { axisX: 0, pointerActive: false, pointerX: 0 };

describe("contact asset destructibility", () => {
  it("generates hazards and weapon pickups as one-shot objects", () => {
    const plan = createRoundPlan(30, 3030);
    const assets = plan.entities.filter((entity) => [ENTITY.HAZARD, ENTITY.WEAPON_PICKUP].includes(entity.type));

    expect(assets.length).toBeGreaterThan(0);
    expect(assets.every((entity) => entity.health === 1 && entity.maxHealth === 1)).toBe(true);
  });

  it("lets shots collect weapon pickups without recoil", () => {
    const state = startRun(createAppState(createDefaultSave()), 440);
    state.run.player.ammo = 0;
    state.run.entities = [createWeaponPickup()];
    state.run.bullets = [createPlayerBullet()];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.weaponId).toBe("rifle");
    expect(state.run.entities).toHaveLength(0);
    expect(state.run.player.recoilTimer).toBe(0);
  });

  it("lets shots clear hazards before they deduct life", () => {
    const state = startRun(createAppState(createDefaultSave()), 441);
    state.run.player.ammo = 0;
    state.run.entities = [createHazard()];
    state.run.bullets = [createPlayerBullet()];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities).toHaveLength(0);
    expect(state.run.modifiers.ammo).toBeUndefined();
    expect(state.run.player.recoilTimer).toBe(0);
    expect(state.run.messages.at(-1).text).toBe("Debuff cleared");
  });

  it("keeps generated entity interaction contracts unambiguous", () => {
    for (let level = 1; level <= 200; level += 1) {
      const plan = createRoundPlan(level, level * 2089);
      plan.entities.forEach(assertEntityContract);
    }
  });

  it("lets bullets pass through cash while cash remains contact collectible", () => {
    const state = startRun(createAppState(createDefaultSave()), 442);
    state.run.player.ammo = 0;
    state.run.entities = [createCash(), createEnemy()];
    state.run.bullets = [createPlayerBullet()];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities.some((entity) => entity.type === ENTITY.CASH)).toBe(true);
    expect(state.run.entities.find((entity) => entity.type === ENTITY.ENEMY).health).toBe(2);
  });
});

function assertEntityContract(entity) {
  if (entity.type === ENTITY.CASH) {
    expect(canDamageEntity(entity)).toBe(false);
    expect(canCollectEntity(entity)).toBe(true);
    return;
  }

  if ([ENTITY.PICKUP, ENTITY.WEAPON_PICKUP, ENTITY.GATE, ENTITY.HAZARD].includes(entity.type)) {
    expect(canDamageEntity(entity)).toBe(true);
    expect(canCollectEntity(entity)).toBe(true);
    expect(isBlockingEntity(entity)).toBe(false);
    return;
  }

  expect(canCollectEntity(entity)).toBe(false);
  expect(canDamageEntity(entity)).toBe(true);
}

function createCash() {
  return { id: 304, type: ENTITY.CASH, x: 0, z: 3, width: 1, depth: 1, value: 20, active: true, collected: false };
}

function createEnemy() {
  return { id: 305, type: ENTITY.ENEMY, x: 0, z: 3, width: 1, depth: 1, health: 10, maxHealth: 10, value: 10, active: true };
}

function createWeaponPickup() {
  return {
    id: 301,
    type: ENTITY.WEAPON_PICKUP,
    x: 0,
    z: 3,
    width: 1,
    depth: 1,
    weaponId: "rifle",
    label: "Rifle",
    health: 1,
    maxHealth: 1,
    active: true,
    collected: false,
  };
}

function createHazard() {
  return {
    id: 302,
    type: ENTITY.HAZARD,
    x: 0,
    z: 3,
    width: 1,
    depth: 1,
    stat: "ammo",
    value: -10,
    label: "Ammo -10",
    health: 1,
    maxHealth: 1,
    active: true,
    collected: false,
  };
}

function createPlayerBullet() {
  return {
    id: 303,
    owner: "player",
    x: 0,
    z: 2.5,
    width: 0.2,
    depth: 0.2,
    damage: 8,
    remainingRange: 10,
    active: true,
  };
}
