import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ENTITY } from "../../src/game/content/constants.js";
import { animateActorObject, createEntityObject, createSoldierObject, updateHealthObject } from "../../src/render/objects/actors.js";
import { HUMANOID_MOTION } from "../../src/render/objects/humanoidMotion.js";
import { createOperatorLodBatch } from "../../src/render/objects/operatorLod.js";
import { createProjectileVfxManager } from "../../src/render/objects/approvedProjectiles.js";
import { createProjectilePool } from "../../src/render/objects/projectilePool.js";
import { animateWeaponObject, createWeaponObject } from "../../src/render/objects/weapons.js";

describe("approved production assets", () => {
  beforeAll(() => vi.stubGlobal("document", { createElement: createCanvasStub }));
  afterAll(() => vi.unstubAllGlobals());

  it("uses approved socketed models for every live player weapon", () => {
    ["pistol", "shotgun", "machineGun", "rifle"].forEach((weaponId) => {
      const weapon = createWeaponObject(weaponId);
      expect(weapon.userData.approvedAsset).toBe(true);
      expect(weapon.userData.productionAsset).toBe(true);
      expect(weapon.getObjectByName("muzzle")).toBeTruthy();
      expect(weapon.getObjectByName("grip_primary")).toBeTruthy();
      expect(weapon.getObjectByName("grip_support")).toBeTruthy();
      animateWeaponObject(weapon, 0.2, true);
      expect(Number.isFinite(weapon.position.z)).toBe(true);
    });
  });

  it("graduates posted gates, icon pickups, and stateful brick walls", () => {
    const gate = createEntityObject(entity(ENTITY.GATE, { gateType: "buff" }));
    const pickup = createEntityObject(entity(ENTITY.PICKUP, { stat: "ammo", value: 20 }));
    const wallEntity = entity(ENTITY.SOLID_WALL, { health: 100, maxHealth: 100 });
    const wall = createEntityObject(wallEntity);

    expect(gate.children.filter((child) => child.name === "gate-post")).toHaveLength(2);
    expect(pickup.getObjectByName("pickup-icon-ammo")).toBeTruthy();
    expect(wall.getObjectByProperty("isInstancedMesh", true)).toBeTruthy();

    updateHealthObject(wall, { ...wallEntity, health: 50 });
    expect(wall.children[0].userData.damageStage).toBe("cracked");
    updateHealthObject(wall, { ...wallEntity, health: 20 });
    expect(wall.children[0].userData.damageStage).toBe("critical");
  });

  it("uses approved articulated operators for soldiers and shooters", () => {
    const soldier = createSoldierObject();
    const shooter = createEntityObject(entity(ENTITY.SHOOTER, { shooterKind: "still" }));
    [soldier, shooter].forEach((actor) => {
      expect(actor.userData.approvedAsset).toBe(true);
      animateActorObject(actor, HUMANOID_MOTION.LEFT, 0.7);
      expect(actor.userData.animation).toBe("strafeLeft");
    });
  });

  it("keeps far operators and ordinary projectiles inside fixed draw pools", () => {
    const lod = createOperatorLodBatch(12);
    lod.update(Array.from({ length: 12 }, (_, index) => ({ faction: "enemy", scale: 1, x: index % 3, z: 50 + index })));
    const lodMeshes = collectMeshes(lod.group, true).filter((mesh) => mesh.count > 0);
    expect(lodMeshes).toHaveLength(5);
    expect(lodMeshes.reduce((sum, mesh) => sum + mesh.count, 0)).toBeGreaterThan(12);

    const scene = new THREE.Scene();
    const pool = createProjectilePool(scene, 8);
    pool.sync([
      { id: 1, owner: "player", weaponId: "pistol", x: 0, z: 4 },
      { id: 2, owner: "enemy", color: "#45d8ff", x: 1, z: 8 },
    ]);
    expect(collectMeshes(scene, true)).toHaveLength(12);
    expect(scene.children.reduce((sum, mesh) => sum + mesh.count, 0)).toBe(4);
    pool.dispose();
  });

  it("expires approved muzzle and impact effects without leaving scene children", () => {
    const scene = new THREE.Scene();
    const effects = createProjectileVfxManager(scene);
    const projectile = { owner: "player", weaponId: "rifle" };
    const position = new THREE.Vector3(0, 0.58, 4);
    effects.spawnMuzzle(projectile, position);
    effects.spawnImpact(projectile, position);
    expect(scene.children).toHaveLength(2);
    effects.update(0.5);
    expect(scene.children).toHaveLength(0);
    effects.dispose();
  });
});

function entity(type, overrides = {}) {
  return { id: 1, type, label: "Target", health: 10, maxHealth: 10, active: true, x: 0, z: 12, ...overrides };
}

function collectMeshes(root, instancedOnly) {
  const meshes = [];
  root.traverse((object) => {
    if (object.isMesh && (!instancedOnly || object.isInstancedMesh)) meshes.push(object);
  });
  return meshes;
}

function createCanvasStub() {
  return { getContext: createContextStub, height: 0, width: 0 };
}

function createContextStub() {
  return {
    arcTo: noop,
    beginPath: noop,
    clearRect: noop,
    closePath: noop,
    fill: noop,
    fillText: noop,
    moveTo: noop,
    stroke: noop,
  };
}

function noop() {}
