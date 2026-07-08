import { describe, expect, it } from "vitest";
import { ENTITY, PHASE } from "../../src/game/content/constants.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { updateRunState } from "../../src/game/simulation/updateRun.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { getCollisionPenalty } from "../../src/game/simulation/scoring.js";

const idleInput = { axisX: 0, pointerActive: false, pointerX: 0 };

describe("updateRunState", () => {
  it("moves the player toward automatic pointer position", () => {
    const state = startRun(createAppState(createDefaultSave()), 99);

    updateRunState(state, { ...idleInput, pointerActive: true, pointerX: 3 }, 0.1);

    expect(state.run.player.x).toBeGreaterThan(0);
  });

  it("applies a green gate buff on contact", () => {
    const state = startRun(createAppState(createDefaultSave()), 77);
    state.run.entities = [createContactGate()];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.modifiers.power).toBe(5);
    expect(state.run.stats.power).toBeGreaterThan(10);
  });

  it("completes a run and moves to the shop", () => {
    const state = startRun(createAppState(createDefaultSave()), 44);
    state.run.distance = state.run.profile.trackLength - 0.1;

    const next = updateRunState(state, idleInput, 1);

    expect(next.phase).toBe(PHASE.SHOP);
    expect(next.save.cash).toBeGreaterThan(150);
    expect(next.save.level).toBe(2);
  });

  it("lets shots neutralize a red debuff gate", () => {
    const state = startRun(createAppState(createDefaultSave()), 88);
    const gate = createContactGate("debuff");
    gate.z = 1.1;
    gate.health = 1;
    state.run.player.shotTimer = 999;
    state.run.entities = [gate];
    state.run.bullets = [createPlayerBullet(900)];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities.length).toBe(0);
    expect(state.run.damageNumbers.at(-1).value).toBe(8);
    expect(state.run.modifiers.power).toBeUndefined();
  });

  it("removes destroyed green gates instead of leaving broken blockers", () => {
    const state = startRun(createAppState(createDefaultSave()), 89);
    const gate = createContactGate("buff");
    gate.z = 1.1;
    gate.health = 1;
    state.run.player.shotTimer = 999;
    state.run.entities = [gate];
    state.run.bullets = [createPlayerBullet(901)];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities.length).toBe(0);
    expect(state.run.modifiers.power).toBeUndefined();
  });

  it("bounces the player on first live target collision", () => {
    const state = startRun(createAppState(createDefaultSave()), 19);
    state.run.player.x = 0;
    state.run.player.targetX = 0;
    state.run.entities = [createWall()];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities[0].active).toBe(true);
    expect(state.run.entities[0].contactHits).toBe(1);
    expect(state.run.entities[0].z).toBeGreaterThan(state.run.profile.speed * 1.4);
    expect(state.run.player.recoilZ).toBeGreaterThan(0);
    expect(state.run.scorePenalty).toBeGreaterThan(0);
    expect(state.run.messages.at(-1).text).toContain("Bounce");
    expect(state.run.audioEvents.some((event) => event.type === "scoreLoss")).toBe(true);
  });

  it("smoothly bounces for about 1.5 seconds after collecting a pickup", () => {
    const state = startRun(createAppState(createDefaultSave()), 191);
    state.run.entities = [createAmmoPickup({ z: 0 })];

    updateRunState(state, idleInput, 0.016);
    expect(state.run.player.recoilTimer).toBeCloseTo(1.5);
    expect(state.run.player.recoilZ).toBeGreaterThan(0.8);

    advanceFrames(state, 15, 0.05);
    expect(state.run.player.recoilZ).toBeGreaterThan(0.25);

    advanceFrames(state, 16, 0.05);
    expect(state.run.player.recoilTimer).toBe(0);
    expect(state.run.player.recoilZ).toBe(0);
  });

  it("awards ammo proportionally to finite ammo target damage", () => {
    const state = startRun(createAppState(createDefaultSave()), 192);
    state.run.player.shotTimer = 999;
    state.run.player.ammo = 0;
    state.run.entities = [createAmmoPickup({ z: 3, health: 10, ammoCap: 20 })];
    state.run.bullets = [createPlayerBullet(910, { damage: 5, z: 2.5 })];

    updateRunState(state, idleInput, 0.016);
    expect(state.run.player.ammo).toBe(10);
    expect(state.run.entities[0].ammoEarned).toBe(10);

    state.run.bullets = [createPlayerBullet(911, { damage: 99, z: state.run.entities[0].z - 0.2 })];
    updateRunState(state, idleInput, 0.016);

    expect(state.run.player.ammo).toBe(20);
    expect(state.run.entities.length).toBe(0);
  });

  it("does not grant the full ammo bank on untouched pickup contact", () => {
    const state = startRun(createAppState(createDefaultSave()), 193);
    state.run.player.shotTimer = 999;
    state.run.player.ammo = 4;
    state.run.entities = [createAmmoPickup({ z: 0, ammoCap: 18 })];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.player.ammo).toBe(4);
    expect(state.run.messages.at(-1).text).toContain("0/18");
  });

  it("lets enemy shots reduce round score without ending the run", () => {
    const state = startRun(createAppState(createDefaultSave()), 91);
    state.run.distance = 20;
    state.run.score = 50;
    state.run.enemyProjectiles = [createEnemyProjectile()];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.scorePenalty).toBe(25);
    expect(state.run.score).toBeLessThan(50);
    expect(state.phase).toBe(PHASE.RUNNING);
  });

  it("lets the player force through on a second live target collision", () => {
    const state = startRun(createAppState(createDefaultSave()), 92);
    state.run.entities = [createEnemyTarget()];

    updateRunState(state, idleInput, 0.016);
    const firstPenalty = state.run.scorePenalty;
    state.run.entities[0].z = 0;
    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities.length).toBe(0);
    expect(state.run.scorePenalty).toBeGreaterThan(firstPenalty);
    expect(state.run.damageNumbers.at(-1).tone).toBe("penalty");
  });

  it("queues shot sound events when weapons fire", () => {
    const state = startRun(createAppState(createDefaultSave()), 63);

    updateRunState(state, idleInput, 0.016);

    expect(state.run.audioEvents.some((event) => event.type === "shot" && event.owner === "player")).toBe(true);
  });

  it("uses forgiving early collision penalties", () => {
    const enemy = createEnemyTarget();

    expect(getCollisionPenalty(enemy, 1, 1)).toBeLessThan(getCollisionPenalty(enemy, 1, 2));
    expect(getCollisionPenalty(enemy, 1, 1)).toBeLessThan(getCollisionPenalty(enemy, 30, 1));
  });
});

function createContactGate(gateType = "buff") {
  return {
    id: 100,
    type: ENTITY.GATE,
    gateType,
    stat: "power",
    value: gateType === "buff" ? 5 : -5,
    label: "Power +5",
    x: 0,
    z: 0,
    width: 1,
    depth: 1,
    health: 10,
    maxHealth: 10,
    active: true,
    collected: false,
  };
}

function createWall() {
  return {
    id: 101,
    type: ENTITY.SOLID_WALL,
    x: 0,
    z: 0,
    width: 1,
    depth: 1,
    health: 99,
    maxHealth: 99,
    active: true,
  };
}

function createEnemyTarget() {
  return {
    id: 103,
    type: ENTITY.ENEMY,
    x: 0,
    z: 0,
    width: 1,
    depth: 1,
    health: 20,
    maxHealth: 20,
    penalty: 25,
    active: true,
  };
}

function createEnemyProjectile() {
  return {
    id: 102,
    owner: "enemy",
    x: 0,
    z: 0,
    vx: 0,
    vz: -1,
    width: 0.2,
    depth: 0.2,
    penalty: 25,
    active: true,
  };
}

function createPlayerBullet(id, options = {}) {
  return {
    id,
    x: 0,
    z: options.z ?? 0.8,
    width: 0.2,
    depth: 0.2,
    damage: options.damage ?? 8,
    remainingRange: 10,
    active: true,
  };
}

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

function advanceFrames(state, count, dt) {
  for (let index = 0; index < count; index += 1) {
    updateRunState(state, idleInput, dt);
  }
}
