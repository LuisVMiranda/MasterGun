import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ENTITY } from "../../src/game/content/constants.js";
import { createPlayerObject, createSoldierObject, setPlayerWeaponObject } from "../../src/render/objects/actors.js";
import { addContactShadow, getEntityShadowStyle } from "../../src/render/objects/shadows.js";

describe("gameplay shadows", () => {
  it("gives the player weapon and soldiers grounded contact shadows", () => {
    const player = createPlayerObject();
    const soldier = createSoldierObject();

    expect(player.userData.contactShadow.userData.isContactShadow).toBe(true);
    expect(soldier.userData.contactShadow.userData.isContactShadow).toBe(true);
    expect(countShadowCasters(player)).toBeGreaterThan(0);
    expect(countShadowCasters(soldier)).toBeGreaterThan(10);
  });

  it("builds weapon-shaped compound shadows instead of one round blob", () => {
    const player = createPlayerObject();
    const pistolShadow = player.userData.contactShadow;
    setPlayerWeaponObject(player, "machineGun", false);
    const machineGunShadow = player.userData.contactShadow;

    expect(pistolShadow.children.length).toBeGreaterThanOrEqual(2);
    expect(machineGunShadow.children.length).toBeGreaterThan(pistolShadow.children.length);
    expect(machineGunShadow.userData.weaponId).toBe("machineGun");
  });

  it("defines distinct silhouettes for every weapon and Duplas", () => {
    const player = createPlayerObject();
    const partCounts = ["pistol", "shotgun", "machineGun", "rifle"].map((weaponId) => {
      setPlayerWeaponObject(player, weaponId, false);
      expect(player.userData.contactShadow.userData.weaponId).toBe(weaponId);
      return player.userData.contactShadow.children.length;
    });
    setPlayerWeaponObject(player, "rifle", true);

    expect(partCounts.every((count) => count >= 2)).toBe(true);
    expect(new Set(partCounts).size).toBeGreaterThan(1);
    expect(player.userData.contactShadow.children.length).toBe(partCounts[3] * 2);
  });

  it("keeps boss shadows stronger than obstacles and pickups", () => {
    const boss = getEntityShadowStyle(ENTITY.BOSS);
    const wall = getEntityShadowStyle(ENTITY.SOLID_WALL);
    const pickup = getEntityShadowStyle(ENTITY.PICKUP);

    expect(boss.opacity).toBeGreaterThan(wall.opacity);
    expect(wall.opacity).toBeLessThan(0.1);
    expect(pickup.opacity).toBeLessThan(0.1);
    expect(boss.casts).toBe(true);
    expect(wall.casts).toBe(false);
  });

  it("reuses transparent contact shadow materials", () => {
    const style = getEntityShadowStyle(ENTITY.PICKUP);
    const first = addContactShadow(new THREE.Group(), style).userData.contactShadow;
    const second = addContactShadow(new THREE.Group(), style).userData.contactShadow;

    expect(first.material).toBe(second.material);
    expect(first.material.depthWrite).toBe(false);
  });
});

function countShadowCasters(root) {
  let count = 0;
  root.traverse((child) => { if (child.castShadow) count += 1; });
  return count;
}
