import { describe, expect, it } from "vitest";
import { ENTITY } from "../../src/game/content/constants.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createRoundPlan } from "../../src/game/simulation/roundGenerator.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { updateRunState } from "../../src/game/simulation/updateRun.js";

const idleInput = { axisX: 0, pointerActive: false, pointerX: 0 };

describe("recruitment and projectile fairness", () => {
  it("blocks enemy shots with walls before they can hit the player", () => {
    const state = startRun(createAppState(createDefaultSave()), 610);
    state.run.player.life = 40;
    state.run.player.ammo = 0;
    state.run.entities = [createWall({ z: 2.2 })];
    state.run.enemyProjectiles = [createEnemyProjectile({ z: 2.4, vz: -42 })];

    updateRunState(state, idleInput, 0.05);

    expect(state.run.enemyProjectiles).toHaveLength(0);
    expect(state.run.scorePenalty).toBe(0);
    expect(state.run.player.life).toBeGreaterThan(39);
  });

  it("blocks enemy shots with shield carriers before they can hit the player", () => {
    const state = startRun(createAppState(createDefaultSave()), 611);
    state.run.player.life = 40;
    state.run.player.ammo = 0;
    state.run.entities = [createShieldEnemy({ z: 2.2 })];
    state.run.enemyProjectiles = [createEnemyProjectile({ z: 2.4, vz: -42 })];

    updateRunState(state, idleInput, 0.05);

    expect(state.run.enemyProjectiles).toHaveLength(0);
    expect(state.run.scorePenalty).toBe(0);
    expect(state.run.player.life).toBeGreaterThan(39);
  });

  it("recruits one temporary soldier per shot instead of per damage amount", () => {
    const state = startRun(createAppState(createDefaultSave()), 612);
    const recruiter = createRecruiter({ z: 1.22, recruitCap: 4 });
    state.run.player.ammo = 0;
    state.run.entities = [recruiter];
    state.run.bullets = [createPlayerBullet({ damage: 99 })];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.soldiers).toHaveLength(1);
    expect(state.run.soldiers[0].active).toBe(true);
    expect(state.run.entities[0].health).toBe(3);
    expect(state.run.messages.at(-1).text).toContain("Soldiers +1");
  });

  it("lets recruited soldiers shoot and take enemy projectile damage", () => {
    const state = startRun(createAppState(createDefaultSave()), 613);
    state.run.player.ammo = 0;
    state.run.entities = [];
    state.run.soldiers = [createSoldier()];
    state.run.enemyProjectiles = [createEnemyProjectile({ x: -0.62, z: -0.5, vz: -1 })];

    updateRunState(state, idleInput, 0.016);

    const soldierBullet = state.run.bullets.find((bullet) => bullet.owner === "soldier");
    expect(soldierBullet.damage).toBeLessThan(state.run.stats.power);
    expect(state.run.enemyProjectiles).toHaveLength(0);
    expect(state.run.soldiers[0].active).toBe(false);
  });

  it("places recruit sections sparingly and before the boss on cadence levels", () => {
    const plan = createRoundPlan(55, 5500);
    const recruiters = plan.entities.filter((entity) => entity.type === ENTITY.RECRUITER);
    const boss = plan.entities.find((entity) => entity.type === ENTITY.BOSS);
    const toughAfterRecruit = plan.entities.filter((entity) => isPostRecruitPressure(entity, recruiters[0], boss));

    expect(recruiters).toHaveLength(1);
    expect(recruiters[0].z).toBeLessThan(boss.z);
    expect(toughAfterRecruit.length).toBeGreaterThanOrEqual(3);
    expect(plan.entities.filter((entity) => entity.type === ENTITY.BOSS)).toHaveLength(1);
  });
});

function createWall(options = {}) {
  return {
    id: 201,
    type: ENTITY.SOLID_WALL,
    x: options.x ?? 0,
    z: options.z ?? 2,
    width: 0.9,
    depth: 0.36,
    health: 30,
    maxHealth: 30,
    active: true,
  };
}

function createShieldEnemy(options = {}) {
  return {
    id: 202,
    type: ENTITY.ENEMY,
    enemyKind: "shield",
    x: 0,
    z: options.z ?? 2,
    width: 0.52,
    depth: 0.36,
    health: 30,
    maxHealth: 30,
    active: true,
  };
}

function createRecruiter(options = {}) {
  return {
    id: 203,
    type: ENTITY.RECRUITER,
    x: 0,
    z: options.z ?? 1.2,
    width: 1,
    depth: 0.5,
    health: options.recruitCap ?? 4,
    maxHealth: options.recruitCap ?? 4,
    recruitCap: options.recruitCap ?? 4,
    recruited: 0,
    active: true,
  };
}

function createSoldier() {
  return {
    id: 204,
    x: 0,
    z: -0.5,
    width: 0.24,
    depth: 0.26,
    health: 1,
    maxHealth: 1,
    shotTimer: -1,
    active: true,
  };
}

function createEnemyProjectile(options = {}) {
  return {
    id: 205,
    owner: "enemy",
    x: options.x ?? 0,
    z: options.z ?? 0,
    vx: 0,
    vz: options.vz ?? -1,
    width: 0.18,
    depth: 0.18,
    penalty: 30,
    active: true,
  };
}

function createPlayerBullet(options = {}) {
  return {
    id: 206,
    owner: "player",
    x: 0,
    z: 0.85,
    width: 0.2,
    depth: 0.2,
    damage: options.damage ?? 8,
    remainingRange: 10,
    active: true,
  };
}

function isPostRecruitPressure(entity, recruiter, boss) {
  const toughTypes = new Set([ENTITY.BARRICADE, ENTITY.SOLID_WALL, ENTITY.ENEMY]);
  return toughTypes.has(entity.type) && entity.z > recruiter.z && entity.z < boss.z;
}
