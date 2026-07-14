import { describe, expect, it } from "vitest";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { activateRunEffect, advanceSpecialShot, getSpecialShotDamage, hasRunEffect } from "../../src/game/simulation/runEffects.js";
import { createAppState, startRun } from "../../src/game/simulation/runState.js";
import { updateRunState } from "../../src/game/simulation/updateRun.js";

const idle = { axisX: 0, pointerActive: false, pointerX: 0, confirmPressed: false };

describe("temporary run effects", () => {
  it("freezes the world during the five-second special-shot aim", () => {
    const state = startRun(createAppState(createDefaultSave()), 1501);
    const distance = state.run.distance;
    activateRunEffect(state.run, "specialShot");

    updateRunState(state, idle, 0.5);

    expect(state.run.distance).toBe(distance);
    expect(state.run.specialShot.remaining).toBeCloseTo(4.95);
  });

  it("fires immediately when special aim is confirmed", () => {
    const state = startRun(createAppState(createDefaultSave()), 1502);
    activateRunEffect(state.run, "specialShot");
    advanceSpecialShot(state.run, idle, 0.05);
    const fired = advanceSpecialShot(state.run, { ...idle, confirmPressed: true }, 0.05);

    const projectile = state.run.bullets.at(-1);
    expect(fired).toBe(true);
    expect(state.run.specialShot.remaining).toBeGreaterThan(4);
    expect(projectile.special).toBe(true);
    expect(projectile.speed).toBeLessThan(28);
    expect(projectile.width).toBeGreaterThan(0.4);
    expect(projectile.remainingRange).toBeGreaterThanOrEqual(56);
    expect(projectile.remainingRange).toBeGreaterThanOrEqual(state.run.stats.range * 2);
  });

  it("caps special-shot boss damage at half maximum life", () => {
    const boss = { type: "boss", health: 900, maxHealth: 1000 };
    expect(getSpecialShotDamage(boss)).toBe(500);
  });

  it("supports firing at zero ammo during free fire and blocks forced reloads", () => {
    const free = startRun(createAppState(createDefaultSave()), 1503);
    free.run.player.ammo = 0;
    activateRunEffect(free.run, "noAmmoConsumption");
    updateRunState(free, idle, 0.016);
    expect(free.run.bullets.some((bullet) => bullet.owner === "player")).toBe(true);
    expect(free.run.player.ammo).toBe(0);

    const reload = startRun(createAppState(createDefaultSave()), 1504);
    activateRunEffect(reload.run, "forceReload");
    updateRunState(reload, idle, 0.016);
    expect(reload.run.bullets.some((bullet) => bullet.owner === "player")).toBe(false);
    expect(hasRunEffect(reload.run, "forceReload")).toBe(true);
  });

  it("applies forced reload through actual red-gate contact", () => {
    const state = startRun(createAppState(createDefaultSave()), 1506);
    state.run.player.shotTimer = 999;
    state.run.entities = [createEffectGate("forceReload")];
    updateRunState(state, idle, 0.016);
    expect(hasRunEffect(state.run, "forceReload")).toBe(true);

    state.run.entities = [];
    state.run.bullets = [];
    state.run.player.shotTimer = 0;
    updateRunState(state, idle, 0.016);
    expect(state.run.bullets.some((bullet) => bullet.owner === "player")).toBe(false);
  });

  it("activates every timed red effect when automatic fire destroys its asset", () => {
    ["thinProjectile", "forceReload", "forceSoldierReload"].forEach((effect, index) => {
      const state = startRun(createAppState(createDefaultSave()), 1600 + index);
      const gate = createEffectGate(effect);
      gate.z = 1.1;
      gate.health = 1;
      state.run.player.shotTimer = 999;
      state.run.entities = [gate];
      state.run.bullets = [createShot(810 + index)];

      updateRunState(state, idle, 0.016);

      expect(hasRunEffect(state.run, effect)).toBe(true);
    });
  });

  it("activates timed effects from their generated floor-asset contracts", () => {
    const cases = [
      ["pickup", "noAmmoConsumption"],
      ["pickup", "specialShot"],
      ["hazard", "thinProjectile"],
      ["hazard", "forceReload"],
      ["hazard", "forceSoldierReload"],
    ];

    cases.forEach(([type, effect], index) => {
      const state = startRun(createAppState(createDefaultSave()), 1800 + index);
      state.run.player.shotTimer = 999;
      state.run.entities = [createEffectAsset(type, effect)];
      state.run.bullets = [createShot(920 + index)];

      updateRunState(state, idle, 0.016);

      const active = effect === "specialShot" ? state.run.specialShot?.active : hasRunEffect(state.run, effect);
      expect(active, `${type}:${effect}`).toBe(true);
    });
  });

  it("clears soldier rounds and prevents formation fire during soldier reload", () => {
    const state = startRun(createAppState(createDefaultSave()), 1701);
    state.run.soldiers = [{ id: 40, health: 2, maxHealth: 2, shotTimer: 0, x: 0, z: -0.9, width: 0.22, depth: 0.24, active: true }];
    state.run.bullets = [{ ...createShot(901), owner: "soldier" }];

    activateRunEffect(state.run, "forceSoldierReload");
    updateRunState(state, idle, 0.016);

    expect(state.run.soldiers[0].shotTimer).toBeGreaterThan(2.9);
    expect(state.run.bullets.some((bullet) => bullet.owner === "soldier" && bullet.active)).toBe(false);
  });

  it("makes player projectiles thinner for the accuracy debuff", () => {
    const state = startRun(createAppState(createDefaultSave()), 1505);
    state.run.bullets = [createShot(900)];
    activateRunEffect(state.run, "thinProjectile");
    updateRunState(state, idle, 0.016);
    const activePlayerShots = state.run.bullets.filter((bullet) => bullet.owner === "player" && bullet.active);
    expect(activePlayerShots.length).toBeGreaterThan(0);
    expect(activePlayerShots.every((bullet) => bullet.thin && bullet.width < 0.06)).toBe(true);
  });
});

function createEffectGate(stat) {
  return {
    id: 700,
    type: "gate",
    gateType: "debuff",
    stat,
    value: 0,
    label: stat,
    x: 0,
    z: 0,
    width: 1,
    depth: 1,
    health: 16,
    maxHealth: 16,
    active: true,
    collected: false,
  };
}

function createShot(id) {
  return {
    id,
    owner: "player",
    x: 0,
    z: 0.8,
    width: 0.11,
    depth: 0.14,
    damage: 20,
    remainingRange: 12,
    active: true,
  };
}

function createEffectAsset(type, stat) {
  return {
    ...createEffectGate(stat),
    id: 710,
    type,
    gateType: undefined,
    z: 1.1,
    health: 1,
    maxHealth: 1,
  };
}
