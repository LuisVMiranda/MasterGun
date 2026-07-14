import { describe, expect, it } from "vitest";
import { ENTITY, PHASE } from "../../src/game/content/constants.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { updateRunState } from "../../src/game/simulation/updateRun.js";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { getLifePenalty, getLifeRecoveryTarget } from "../../src/game/simulation/life.js";
import { calculateLiveScore, getCollisionPenalty } from "../../src/game/simulation/scoring.js";

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

  it("completes a run and moves to the victory prompt", () => {
    const save = createDefaultSave();
    save.upgrades.assistants = 1;
    const state = startRun(createAppState(save), 44);
    state.run.distance = state.run.profile.trackLength - 0.1;

    const next = updateRunState(state, idleInput, 1);

    expect(next.phase).toBe(PHASE.VICTORY);
    expect(next.save.cash).toBeGreaterThan(150);
    expect(next.save.level).toBe(2);
    expect(next.run.soldiers).toHaveLength(0);
    expect(Number.isFinite(next.lastSummary.highlights.targets)).toBe(true);
  });

  it("blocks checkpoint completion until the boss is defeated", () => {
    const save = createDefaultSave();
    save.level = 5;
    const state = startRun(createAppState(save), 45);
    state.run.distance = state.run.profile.trackLength - 0.1;
    state.run.entities = [createBossTarget({ z: 16 })];

    const next = updateRunState(state, idleInput, 1);

    expect(next.phase).toBe(PHASE.RUNNING);
    expect(next.run.distance).toBe(next.run.profile.trackLength);
    expect(next.run.entities[0].active).toBe(true);
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
    expect(state.run.modifiers.power).toBe(5);
  });

  it("lets fast shots sweep into thin green gates instead of tunneling past", () => {
    const state = startRun(createAppState(createDefaultSave()), 199);
    const gate = createContactGate("buff");
    gate.z = 1.5;
    gate.depth = 0.2;
    gate.health = 5;
    gate.maxHealth = 5;
    state.run.player.ammo = 0;
    state.run.entities = [gate];
    state.run.bullets = [createPlayerBullet(950, { damage: 8, z: 0.8, remainingRange: 10 })];

    updateRunState(state, idleInput, 0.05);

    expect(state.run.entities).toHaveLength(0);
    expect(state.run.damageNumbers.some((damage) => damage.value === 8)).toBe(true);
  });

  it("applies soldier training gates and keeps soldier fire unlimited", () => {
    const state = startRun(createAppState(createDefaultSave()), 200);
    const gate = createContactGate("buff", { stat: "soldierTraining", value: 4 });
    gate.z = 1.1;
    gate.health = 1;
    state.run.player.ammo = 0;
    state.run.soldiers = [{ id: 980, x: 0, z: -0.5, width: 0.22, depth: 0.24, health: 1, maxHealth: 1, shotTimer: 999, active: true }];
    state.run.entities = [gate];
    state.run.bullets = [createPlayerBullet(951)];

    updateRunState(state, idleInput, 0.016);
    expect(state.run.modifiers.soldierTraining).toBe(4);
    expect(state.run.stats.soldierDamageMultiplier).toBeGreaterThan(1.1);

    state.run.soldiers.forEach((soldier) => { soldier.shotTimer = -1; });
    updateRunState(state, idleInput, 0.016);
    expect(state.run.bullets.some((bullet) => bullet.owner === "soldier")).toBe(true);
  });

  it("bounces the player on first live target collision", () => {
    const state = startRun(createAppState(createDefaultSave()), 19);
    state.run.player.x = 0;
    state.run.player.targetX = 0;
    state.run.distance = 40;
    state.run.entities = [createWall(), createEnemyTarget({ id: 106, z: 8 })];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities[0].active).toBe(true);
    expect(state.run.entities[0].contactHits).toBe(1);
    expect(state.run.entities[0].z).toBeGreaterThan(state.run.profile.speed * 1.4);
    expect(state.run.entities[1].z).toBeGreaterThan(16);
    expect(state.run.distance).toBeLessThan(40);
    expect(state.run.player.interruptTimer).toBeCloseTo(1.5);
    expect(state.run.player.recoilZ).toBeGreaterThan(0);
    expect(state.run.scorePenalty).toBeGreaterThan(0);
    expect(state.run.messages.at(-1).text).toContain("Bounce");
    expect(state.run.audioEvents.some((event) => event.type === "scoreLoss")).toBe(true);
  });

  it("does not bounce when passing through an untouched floor pickup", () => {
    const state = startRun(createAppState(createDefaultSave()), 191);
    state.run.entities = [createAmmoPickup({ z: 0 })];
    const lifeBefore = state.run.player.life;

    updateRunState(state, idleInput, 0.016);
    expect(state.run.player.recoilTimer).toBe(0);
    expect(state.run.player.recoilZ).toBe(0);
    expect(state.run.player.interruptTimer).toBe(0);
    expect(state.run.player.life).toBeGreaterThanOrEqual(lifeBefore);
  });

  it("drains life when a collected gate bounces the player", () => {
    const state = startRun(createAppState(createDefaultSave()), 190);
    state.run.entities = [createContactGate()];
    state.run.player.life = 30;
    const lifeBefore = state.run.player.life;

    updateRunState(state, idleInput, 0.016);

    expect(state.run.player.life).toBeLessThan(lifeBefore);
    expect(state.run.player.recoilTimer).toBeGreaterThan(0);
    expect(state.run.damageNumbers.some((damage) => damage.text.includes("Life"))).toBe(true);
  });

  it("lets one shot acquire a floor bonus without player recoil", () => {
    const state = startRun(createAppState(createDefaultSave()), 195);
    state.run.player.shotTimer = 999;
    state.run.entities = [createPowerPickup({ z: 3 })];
    state.run.bullets = [createPlayerBullet(930, { damage: 8, z: 2.5 })];

    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities.length).toBe(0);
    expect(state.run.modifiers.power).toBe(3);
    expect(state.run.player.recoilTimer).toBe(0);
    expect(state.run.metrics.pickupsShot).toBe(1);
    expect(state.run.metrics.greenBuffs).toBe(1);
    expect(state.run.audioEvents.some((event) => event.type === "pickup")).toBe(false);
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
    expect(state.run.player.recoilTimer).toBe(0);
    expect(state.run.messages.at(-1).text).toContain("0/18");
  });

  it("drops enemy cash for runway collection instead of rewarding on kill", () => {
    const state = startRun(createAppState(createDefaultSave()), 194);
    state.run.player.shotTimer = 999;
    state.run.entities = [createEnemyTarget({ z: 3, health: 1, value: 34 })];
    state.run.bullets = [createPlayerBullet(920, { damage: 8, z: 2.5 })];

    updateRunState(state, idleInput, 0.016);
    const cash = state.run.entities.find((entity) => entity.type === ENTITY.CASH);

    expect(state.run.destroyedValue).toBe(0);
    expect(cash.value).toBe(34);

    cash.z = 0;
    updateRunState(state, idleInput, 0.016);

    expect(state.run.destroyedValue).toBe(34);
    expect(state.run.player.recoilTimer).toBe(0);
  });

  it("drops boss cash and completes checkpoint runs after collection", () => {
    const save = createDefaultSave();
    save.level = 5;
    const state = startRun(createAppState(save), 201);
    state.run.player.ammo = 0;
    state.run.player.life = 60;
    state.run.entities = [createBossTarget({ z: 3, health: 1, value: 220 })];
    state.run.bullets = [createPlayerBullet(960, { damage: 8, z: 2.5 })];

    const afterKill = updateRunState(state, idleInput, 0.016);
    const cash = afterKill.run.entities.find((entity) => entity.type === ENTITY.CASH && entity.sourceType === ENTITY.BOSS);

    expect(afterKill.phase).toBe(PHASE.RUNNING);
    expect(cash.value).toBe(220);

    cash.x = 0;
    cash.z = 0;
    const completed = updateRunState(afterKill, idleInput, 0.016);

    expect(completed.phase).toBe(PHASE.VICTORY);
    expect(completed.save.level).toBe(6);
  });

  it("fires unlimited smaller soldier projectiles", () => {
    const state = startRun(createAppState(createDefaultSave()), 196);
    state.run.soldiers = [{ id: 981, x: 0, z: -0.5, width: 0.22, depth: 0.24, health: 1, maxHealth: 1, shotTimer: -1, active: true }];
    state.run.soldiers.forEach((soldier) => { soldier.shotTimer = -1; });

    updateRunState(state, idleInput, 0.016);

    const soldierBullet = state.run.bullets.find((bullet) => bullet.owner === "soldier");
    expect(soldierBullet.width).toBe(0.07);
    expect(soldierBullet.depth).toBe(0.09);
    expect(soldierBullet.visualKind).toBe("soldier");
    expect(Number.isFinite(soldierBullet.bornAt)).toBe(true);

    state.run.soldiers.forEach((soldier) => { soldier.shotTimer = -1; });
    updateRunState(state, idleInput, 0.016);

    expect(state.run.bullets.filter((bullet) => bullet.owner === "soldier")).toHaveLength(2);
  });

  it("applies material-specific damage upgrades to walls and shielded enemies", () => {
    const save = createDefaultSave();
    save.upgrades.wallDamage = 3;
    save.upgrades.shieldDamage = 3;
    const state = startRun(createAppState(save), 197);
    const wall = createWall({ z: 3, health: 100 });
    const shield = createEnemyTarget({ id: 107, x: 2, z: 3, health: 100, enemyKind: "shield" });
    state.run.entities = [wall, shield];
    state.run.bullets = [createPlayerBullet(940, { damage: 10, z: 2.5 }), createPlayerBullet(941, { x: 2, damage: 10, z: 2.5 })];

    updateRunState(state, idleInput, 0.016);

    expect(wall.health).toBeLessThan(90);
    expect(shield.health).toBeLessThan(90);
    expect(state.run.damageNumbers.map((damage) => damage.value)).toEqual(expect.arrayContaining([15, 15]));
  });

  it("records mission damage as an integer after multipliers", () => {
    const save = createDefaultSave();
    save.upgrades.wallDamage = 1;
    const state = startRun(createAppState(save), 198);
    state.run.entities = [createWall({ z: 3, health: 100 })];
    state.run.bullets = [createPlayerBullet(942, { damage: 7.5, z: 2.5 })];

    updateRunState(state, idleInput, 0.016);

    expect(Number.isInteger(state.run.metrics.damageDealt)).toBe(true);
  });

  it("lets enemy shots reduce round score without ending the run", () => {
    const state = startRun(createAppState(createDefaultSave()), 91);
    state.run.distance = 20;
    state.run.score = 50;
    state.run.player.life = 50;
    state.run.enemyProjectiles = [createEnemyProjectile()];
    const lifeBefore = state.run.player.life;

    updateRunState(state, idleInput, 0.016);
    const scoreWithoutHit = calculateLiveScore({ ...state.run, scorePenalty: 0 });

    expect(state.run.scorePenalty).toBe(25);
    expect(state.run.score).toBeLessThan(scoreWithoutHit);
    expect(state.run.player.life).toBeLessThan(lifeBefore);
    expect(state.phase).toBe(PHASE.RUNNING);
  });

  it("fires normal enemy shots straight while bosses can aim", () => {
    const normalState = startRun(createAppState(createDefaultSave()), 5301);
    normalState.run.player.x = 1.2;
    normalState.run.player.ammo = 0;
    normalState.run.entities = [createShooterTarget()];
    updateRunState(normalState, idleInput, 0.016);

    const bossSave = createDefaultSave();
    bossSave.level = 5;
    const bossState = startRun(createAppState(bossSave), 5305);
    bossState.run.player.x = 1.2;
    bossState.run.player.ammo = 0;
    bossState.run.entities = [createBossTarget({ z: 12 })];
    bossState.run.entities[0].shootCooldown = -1;
    updateRunState(bossState, idleInput, 0.016);

    expect(normalState.run.enemyProjectiles[0].vx).toBe(0);
    expect(Math.abs(bossState.run.enemyProjectiles[0].vx)).toBeGreaterThan(0.1);
  });

  it("recovers life as runway distance increases", () => {
    const state = startRun(createAppState(createDefaultSave()), 93);
    state.run.entities = [];
    state.run.player.shotTimer = 999;

    updateRunState(state, idleInput, 1);

    expect(state.run.player.life).toBeGreaterThan(0);
  });

  it("recovers life faster early and tapers recovery in harder levels", () => {
    expect(getLifeRecoveryTarget(1)).toBeGreaterThan(getLifeRecoveryTarget(25));
    expect(getLifeRecoveryTarget(25)).toBeGreaterThan(getLifeRecoveryTarget(80));
    expect(getLifeRecoveryTarget(80)).toBeGreaterThan(getLifeRecoveryTarget(200));
  });

  it("starts with zero life unless base life is upgraded", () => {
    const base = startRun(createAppState(createDefaultSave()), 95);
    const save = createDefaultSave();
    save.upgrades.baseLife = 3;
    const upgraded = startRun(createAppState(save), 96);

    expect(base.run.player.life).toBe(0);
    expect(upgraded.run.player.life).toBeGreaterThan(0);
  });

  it("fails the run without advancing level when life reaches zero", () => {
    const state = startRun(createAppState(createDefaultSave()), 94);
    state.run.player.life = 1;
    state.run.entities = [createWall()];

    const next = updateRunState(state, idleInput, 0.016);

    expect(next.phase).toBe(PHASE.SHOP);
    expect(next.lastSummary.failed).toBe(true);
    expect(next.lastSummary.reward).toBe(0);
    expect(next.save.level).toBe(1);
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

  it("keeps a boss active after repeated player collisions", () => {
    const save = createDefaultSave();
    save.level = 5;
    const state = startRun(createAppState(save), 97);
    state.run.player.life = 80;
    state.run.entities = [createBossTarget()];

    updateRunState(state, idleInput, 0.016);
    state.run.entities[0].z = 0;
    updateRunState(state, idleInput, 0.016);

    expect(state.run.entities[0].active).toBe(true);
    expect(state.run.entities[0].contactHits).toBe(2);
    expect(state.run.player.recoilTimer).toBeGreaterThan(0);
  });

  it("queues shot sound events when weapons fire", () => {
    const state = startRun(createAppState(createDefaultSave()), 63);

    updateRunState(state, idleInput, 0.016);

    expect(state.run.audioEvents.some((event) => event.type === "shot" && event.owner === "player")).toBe(true);
  });

  it("fires a shotgun as one heavy projectile instead of a three-pellet line", () => {
    const save = createDefaultSave();
    save.weaponsOwned = ["pistol", "shotgun"];
    save.equippedWeapon = "shotgun";
    const state = startRun(createAppState(save), 64);

    updateRunState(state, idleInput, 0.016);

    const playerBullets = state.run.bullets.filter((bullet) => bullet.owner === "player");
    expect(playerBullets).toHaveLength(1);
    expect(playerBullets[0].damage).toBeGreaterThan(13);
    expect(playerBullets[0].visualKind).toBe("shotgun");
    expect(playerBullets[0].weaponId).toBe("shotgun");
  });

  it("uses forgiving early collision penalties", () => {
    const enemy = createEnemyTarget();

    expect(getCollisionPenalty(enemy, 1, 1)).toBeLessThan(getCollisionPenalty(enemy, 1, 2));
    expect(getCollisionPenalty(enemy, 1, 1)).toBeLessThan(getCollisionPenalty(enemy, 30, 1));
    expect(getLifePenalty(enemy, 80, 20)).toBeGreaterThan(getLifePenalty(enemy, 1, 20));
  });
});

function createContactGate(gateType = "buff", options = {}) {
  const stat = options.stat ?? "power";
  const value = options.value ?? (gateType === "buff" ? 5 : -5);
  return {
    id: 100, type: ENTITY.GATE, gateType, stat, value,
    label: `${stat} ${value}`,
    x: 0, z: 0, width: 1, depth: 1,
    health: 10, maxHealth: 10,
    active: true, collected: false,
  };
}

function createWall(options = {}) {
  return {
    id: 101,
    type: ENTITY.SOLID_WALL,
    x: options.x ?? 0,
    z: options.z ?? 0,
    width: 1,
    depth: 1,
    health: options.health ?? 99,
    maxHealth: options.health ?? 99,
    active: true,
  };
}

function createEnemyTarget(options = {}) {
  return {
    id: options.id ?? 103,
    type: ENTITY.ENEMY,
    enemyKind: options.enemyKind ?? "runner",
    x: options.x ?? 0,
    z: options.z ?? 0,
    width: 1,
    depth: 1,
    health: options.health ?? 20,
    maxHealth: options.health ?? 20,
    value: options.value ?? 25,
    penalty: 25,
    active: true,
  };
}

function createBossTarget(options = {}) {
  return {
    id: options.id ?? 108,
    type: ENTITY.BOSS,
    x: options.x ?? 0,
    z: options.z ?? 0,
    width: options.width ?? 5,
    depth: 1.3,
    health: options.health ?? 120,
    maxHealth: options.health ?? 120,
    value: options.value ?? 120,
    penalty: 45,
    shootCooldown: 10,
    shootInterval: 10,
    projectileSpeed: 12,
    retreatSpeed: 2,
    active: true,
  };
}

function createShooterTarget(options = {}) {
  return {
    id: options.id ?? 1,
    type: ENTITY.SHOOTER,
    shooterKind: "still",
    x: options.x ?? -0.8,
    originX: options.x ?? -0.8,
    z: options.z ?? 12,
    width: 1,
    depth: 1,
    health: 40,
    maxHealth: 40,
    penalty: 20,
    shootCooldown: -1,
    shootInterval: 10,
    projectileSpeed: 12,
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
    x: options.x ?? 0,
    z: options.z ?? 0.8,
    width: 0.2,
    depth: 0.2,
    damage: options.damage ?? 8,
    remainingRange: options.remainingRange ?? 10,
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

function createPowerPickup(options = {}) {
  return {
    id: 105,
    type: ENTITY.PICKUP,
    x: 0,
    z: options.z ?? 0,
    width: 1,
    depth: 1,
    stat: "power",
    value: 3,
    label: "Power +3",
    health: 1,
    maxHealth: 1,
    active: true,
    collected: false,
  };
}
