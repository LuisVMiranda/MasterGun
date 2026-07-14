import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { updateRunState } from "../../src/game/simulation/updateRun.js";
import { getSoldierFormationScale } from "../../src/game/simulation/soldierBalance.js";
import { getSoldierTargetMultiplier } from "../../src/game/simulation/soldierDamage.js";

const idleInput = { axisX: 0, pointerActive: false, pointerX: 0 };

describe("soldier combat balance", () => {
  it("does not let an early four-soldier volley erase a healthy enemy", () => {
    const state = createSoldierScenario({ level: 25, training: 6, power: 3, count: 4 });
    state.run.entities = [createTarget(ENTITY.ENEMY, 24, 3)];

    advance(state, 0.2);

    expect(state.run.entities).toHaveLength(1);
    expect(state.run.entities[0].health).toBeGreaterThan(0);
  });

  it("keeps a late heavy wall alive after two seconds of max-trained formation fire", () => {
    const state = createSoldierScenario({ level: 200, training: 24, power: 25, count: 4 });
    state.run.entities = [createTarget(ENTITY.SOLID_WALL, 582, 10)];

    advance(state, 2);

    expect(state.run.entities).toHaveLength(1);
    expect(state.run.entities[0].health).toBeGreaterThan(100);
  });

  it("grows formation output sublinearly as more soldiers join", () => {
    const one = getSoldierFormationScale(1);
    const fourTotal = getSoldierFormationScale(4) * 4;
    const eightTotal = getSoldierFormationScale(8) * 8;

    expect(fourTotal).toBeGreaterThan(one);
    expect(fourTotal).toBeLessThan(one * 2.2);
    expect(eightTotal).toBeLessThan(one * 2.5);
  });

  it("applies one target specialty instead of multiplying overlapping bonuses", () => {
    const stats = { soldierFinishDamageMultiplier: 2, soldierWallDamageMultiplier: 3 };
    const finish = { type: ENTITY.FINISH_BLOCK };
    const wall = { type: ENTITY.SOLID_WALL };

    expect(getSoldierTargetMultiplier(stats, finish)).toBe(2);
    expect(getSoldierTargetMultiplier(stats, wall)).toBe(3);
  });
});

function createSoldierScenario(options) {
  const save = createDefaultSave();
  save.level = options.level;
  save.upgrades.assistantAmmo = options.training;
  save.upgrades.power = options.power;
  const state = startRun(createAppState(save), options.level * 73);
  state.run.player.ammo = 0;
  state.run.profile.speed = 0;
  state.run.profile.trackLength = 10000;
  state.run.soldiers = Array.from({ length: options.count }, (_, index) => createSoldier(index));
  return state;
}

function createSoldier(index) {
  return {
    id: 700 + index,
    x: 0,
    z: -0.9,
    width: 0.22,
    depth: 0.24,
    health: 8,
    maxHealth: 8,
    shotTimer: 0,
    active: true,
  };
}

function createTarget(type, health, z) {
  return {
    id: 800,
    type,
    x: 0,
    z,
    width: 9,
    depth: 0.7,
    health,
    maxHealth: health,
    value: 0,
    penalty: 0,
    active: true,
  };
}

function advance(state, seconds) {
  const frame = 0.05;
  for (let elapsed = 0; elapsed < seconds; elapsed += frame) {
    updateRunState(state, idleInput, frame);
  }
}
