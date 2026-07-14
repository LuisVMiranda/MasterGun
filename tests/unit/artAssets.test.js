import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ASSET_MANIFEST, findAssetDefinition, validateAssetManifest } from "../../src/render/assets/assetManifest.js";
import { chooseQualityProfile, getQualityProfile } from "../../src/render/assets/qualityProfiles.js";
import { PROJECTILE_PROFILE_IDS, getProjectileProfileId, getProjectileVisualProfile } from "../../src/render/assets/projectileProfiles.js";
import { createAssetLibrary } from "../../src/render/assets/assetLibrary.js";
import { countTriangles } from "../../src/render/assets/proceduralGeometry.js";
import { animateApprovedOperator, createApprovedOperator } from "../../src/render/objects/approvedOperator.js";
import { createOperatorLodFormation } from "../../src/render/objects/operatorLod.js";
import { ORDINARY_PROJECTILE_DRAW_LIMIT, ORDINARY_PROJECTILE_PROFILE_IDS } from "../../src/render/objects/projectilePool.js";
import { createBrickWall, createFloorPickup, createOccludedAssetHint, createPostedGate, getOccludedPlacementZ, getWallDamageStage, WALL_OCCLUSION_CLEARANCE } from "../../src/render/objects/approvedStructures.js";
import { createApprovedWeapon, APPROVED_WEAPON_IDS } from "../../src/render/objects/approvedWeapons.js";

describe("visual asset contracts", () => {
  it("defines unique, valid assets with required weapon sockets", () => {
    expect(validateAssetManifest()).toEqual([]);
    expect(new Set(ASSET_MANIFEST.map((asset) => asset.id)).size).toBe(ASSET_MANIFEST.length);
    APPROVED_WEAPON_IDS.forEach((id) => {
      expect(findAssetDefinition(id).sockets).toEqual(expect.arrayContaining(["muzzle", "eject", "grip_primary", "grip_support", "shadow_anchor"]));
    });
  });

  it("creates every weapon prototype inside its triangle budget with sockets", () => {
    APPROVED_WEAPON_IDS.forEach((id) => {
      const weapon = createApprovedWeapon(id);
      expect(countTriangles(weapon)).toBeLessThanOrEqual(findAssetDefinition(id).budget.triangles);
      expect(weapon.getObjectByName("muzzle")).toBeTruthy();
      expect(weapon.getObjectByName("shadow_anchor")).toBeTruthy();
    });
  });

  it("creates distinct human operators with the full socket contract", () => {
    const enemy = createApprovedOperator({ faction: "enemy" });
    const soldier = createApprovedOperator({ faction: "soldier" });
    expect(enemy.userData.operator.faction).toBe("enemy");
    expect(soldier.userData.operator.faction).toBe("soldier");
    expect(enemy.getObjectByName("muzzle")).toBeTruthy();
    const bodyTriangles = countTriangles(enemy) - countTriangles(enemy.userData.operator.weapon);
    expect(bodyTriangles).toBeLessThanOrEqual(findAssetDefinition("operatorEnemy").budget.triangles);
  });

  it("batches distant operator formations into ten or fewer draws", () => {
    const items = Array.from({ length: 25 }, (_, index) => ({ x: index % 5, z: Math.floor(index / 5), faction: index % 4 ? "enemy" : "soldier", scale: 0.82 }));
    const formation = createOperatorLodFormation(items);
    const meshes = [];
    formation.traverse((object) => { if (object.isInstancedMesh) meshes.push(object); });
    expect(meshes).toHaveLength(10);
    expect(meshes.every((mesh) => mesh.count > 0)).toBe(true);
  });

  it("builds posted gates and authored wall damage states", () => {
    const gate = createPostedGate({ type: "buff" });
    const postCount = gate.children.filter((child) => child.name === "gate-post").length;
    expect(postCount).toBe(2);
    expect(getWallDamageStage(0.9)).toBe("intact");
    expect(getWallDamageStage(0.5)).toBe("cracked");
    expect(getWallDamageStage(0.2)).toBe("critical");
    expect(getWallDamageStage(0)).toBe("collapsed");
    expect(createBrickWall(0.48).userData.damageStage).toBe("cracked");
  });

  it("supports lateral locomotion while keeping the weapon aimed forward", () => {
    const operator = createApprovedOperator({ faction: "enemy" });
    animateApprovedOperator(operator, "strafeLeft", 0.4);
    const rig = operator.userData.operator;
    expect(operator.userData.animation).toBe("strafeLeft");
    expect(Math.abs(rig.body.rotation.z)).toBeGreaterThan(0.05);
    expect(rig.weapon.rotation.y).toBeCloseTo(Math.PI);
    animateApprovedOperator(operator, "strafeRight", 0.4);
    expect(rig.body.rotation.z).toBeLessThan(0);
  });

  it("keeps both prototype hands forward on their weapon grips", () => {
    const operator = createApprovedOperator({ faction: "enemy" });
    const rig = operator.userData.operator;
    ["idle", "aim", "run", "strafeLeft", "strafeRight", "fire", "reload"].forEach((motion) => {
      animateApprovedOperator(operator, motion, 0.7);
      rig.arms.forEach((arm) => {
        const shoulder = arm.getWorldPosition(new THREE.Vector3());
        const hand = arm.userData.parts.hand.getWorldPosition(new THREE.Vector3());
        expect(hand.z).toBeLessThan(shoulder.z - 0.1);
      });
    });
  });

  it("uses readable pickup contents and exact dashed occlusion hints", () => {
    ["cash", "ammo", "power", "debuff"].forEach((kind) => {
      const pickup = createFloorPickup(kind);
      const crate = pickup.getObjectByName("pickup-crate");
      const icon = pickup.getObjectByName(`pickup-icon-${kind}`);
      expect(icon).toBeTruthy();
      expect(icon.getObjectByName("pickup-sign-backplate")).toBeTruthy();
      const faces = [icon.getObjectByName("pickup-glyph-front"), icon.getObjectByName("pickup-glyph-back")];
      expect(faces.every(Boolean)).toBe(true);
      faces.forEach((face) => expectGlyphFaceToBeFlatAndDoubleSided(face));
      expect(new THREE.Box3().setFromObject(icon).min.y).toBeGreaterThan(new THREE.Box3().setFromObject(crate).max.y + 0.08);
    });
    const source = createApprovedOperator();
    const wall = createBrickWall();
    const hint = createOccludedAssetHint(source, wall);
    expect(hint.isLineLoop).toBe(true);
    expect(hint.material.isLineDashedMaterial).toBe(true);
    expect(hint.userData.occlusionWall).toBe(wall.uuid);
    expect(hint.parent).toBe(wall);
    expect(hint.material.stencilRef).toBe(wall.userData.stencilRef);
    expect(getGeometryDepth(hint.geometry)).toBeLessThan(0.001);
    expect(source.getObjectByName("occluded-asset-hint")).toBeFalsy();
    expect(getOccludedPlacementZ(10) - 10).toBeGreaterThan(WALL_OCCLUSION_CLEARANCE);
  });

  it("uses one stable cash-note silhouette without coplanar bill layers", () => {
    const cash = createFloorPickup("cash");
    const front = cash.getObjectByName("pickup-glyph-front");
    const notes = front.children.filter((child) => child.name === "cash-note");
    const band = front.getObjectByName("cash-band");
    expect(notes).toHaveLength(1);
    expect(band.position.z).toBeGreaterThan(notes[0].position.z);
  });

  it("uses a unique stencil channel for each wall-owned silhouette", () => {
    const first = createBrickWall();
    const second = createBrickWall();
    expect(first.userData.stencilRef).not.toBe(second.userData.stencilRef);
  });

  it("connects distant operator legs to their boots", () => {
    ["enemy", "soldier"].forEach((faction) => {
      const formation = createOperatorLodFormation([{ x: 0, z: 0, faction, scale: 1 }]);
      const batch = formation.children[0];
      const limbs = batch.children.find((child) => child.isInstancedMesh && child.count === 4);
      const boots = batch.children.find((child) => child.isInstancedMesh && child.count === 2);
      expect(getInstanceBottom(limbs, 2) - getInstanceTop(boots, 0)).toBeLessThanOrEqual(0.01);
      expect(getInstanceBottom(limbs, 3) - getInstanceTop(boots, 1)).toBeLessThanOrEqual(0.01);
    });
  });

  it("aims both distant formation arms toward the forward weapon", () => {
    const formation = createOperatorLodFormation([{ x: 0, z: 0, faction: "enemy", scale: 1 }]);
    const limbs = formation.children[0].children.find((child) => child.isInstancedMesh && child.count === 4);
    expect(getInstancePosition(limbs, 0).z).toBeLessThan(-0.1);
    expect(getInstancePosition(limbs, 1).z).toBeLessThan(-0.1);
  });

  it("grounds detailed and distant operator footwear on the runway", () => {
    ["enemy", "soldier"].forEach((faction) => {
      const operator = createApprovedOperator({ faction });
      animateApprovedOperator(operator, "idle", 0.7);
      expect(new THREE.Box3().setFromObject(operator).min.y).toBeCloseTo(0, 3);

      const formation = createOperatorLodFormation([{ x: 0, z: 0, faction, scale: 1 }]);
      const batch = formation.children[0];
      const boots = batch.children.find((child) => child.isInstancedMesh && child.count === 2);
      expect(getInstanceBottom(boots, 0)).toBeCloseTo(0, 3);
      expect(getInstanceBottom(boots, 1)).toBeCloseTo(0, 3);
    });
  });

  it("keeps the pistol receiver slim and recognizable", () => {
    const pistol = createApprovedWeapon("pistol");
    const slide = pistol.getObjectByName("slide");
    slide.geometry.computeBoundingBox();
    expect(slide.geometry.boundingBox.max.x - slide.geometry.boundingBox.min.x).toBeLessThan(0.36);
    expect(pistol.getObjectByName("ejection-port")).toBeTruthy();
  });

  it("caches GLB attempts and clones the procedural fallback", async () => {
    let calls = 0;
    const loader = { loadAsync: async () => { calls += 1; throw new Error("missing prototype"); } };
    const library = createAssetLibrary({ loader, fallbackFactory: () => createApprovedWeapon("pistol") });
    const first = await library.instantiate("pistol");
    const second = await library.instantiate("pistol");
    expect(calls).toBe(1);
    expect(first).not.toBe(second);
    expect(first.userData.weaponId).toBe("pistol");
  });
});

function expectGlyphFaceToBeFlatAndDoubleSided(face) {
  const meshes = [];
  face.traverse((object) => { if (object.isMesh) meshes.push(object); });
  expect(meshes.length).toBeGreaterThan(0);
  meshes.forEach((mesh) => {
    expect(getGeometryDepth(mesh.geometry)).toBeLessThan(0.001);
    expect(mesh.material.side).toBe(THREE.DoubleSide);
  });
}

function getGeometryDepth(geometry) {
  geometry.computeBoundingBox();
  return geometry.boundingBox.max.z - geometry.boundingBox.min.z;
}

function getInstanceBottom(mesh, index) {
  return getInstanceBounds(mesh, index).min.y;
}

function getInstanceTop(mesh, index) {
  return getInstanceBounds(mesh, index).max.y;
}

function getInstanceBounds(mesh, index) {
  mesh.geometry.computeBoundingBox();
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
}

function getInstancePosition(mesh, index) {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
}

describe("projectile and device profiles", () => {
  it("gives every weapon and owner a stable visual identity", () => {
    expect(PROJECTILE_PROFILE_IDS).toEqual(expect.arrayContaining(["pistol", "shotgun", "machineGun", "rifle", "soldier", "enemy", "special"]));
    expect(getProjectileProfileId({ owner: "soldier" })).toBe("soldier");
    expect(getProjectileProfileId({ owner: "enemy" })).toBe("enemy");
    expect(getProjectileProfileId({ owner: "player", weaponId: "rifle" })).toBe("rifle");
  });

  it("reserves the special shot outside the ordinary 12-draw pool", () => {
    expect(ORDINARY_PROJECTILE_PROFILE_IDS).not.toContain("special");
    expect(ORDINARY_PROJECTILE_DRAW_LIMIT).toBeLessThanOrEqual(12);
  });

  it("makes the thin debuff visibly narrower without changing profile length", () => {
    const regular = getProjectileVisualProfile({ owner: "player", weaponId: "shotgun" });
    const thin = getProjectileVisualProfile({ owner: "player", weaponId: "shotgun", thin: true });
    expect(thin.width).toBeLessThan(regular.width * 0.4);
    expect(thin.length).toBe(regular.length);
  });

  it("selects conservative quality for narrow or reduced-motion devices", () => {
    expect(chooseQualityProfile(390, 3)).toBe(getQualityProfile("mobile"));
    expect(chooseQualityProfile(1920, 2)).toBe(getQualityProfile("high"));
    expect(chooseQualityProfile(1920, 2, true)).toBe(getQualityProfile("mobile"));
  });
});
