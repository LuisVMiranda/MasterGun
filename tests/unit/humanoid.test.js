import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createHumanoid, createInfantryRifle, createMeleeWeapon, equipHumanoid } from "../../src/render/objects/humanoid.js";
import { HUMANOID_MOTION, animateHumanoid, resolveHumanoidMotion } from "../../src/render/objects/humanoidMotion.js";

const materials = {
  runner: new THREE.MeshBasicMaterial(),
  brute: new THREE.MeshBasicMaterial(),
  skin: new THREE.MeshBasicMaterial(),
  gear: new THREE.MeshBasicMaterial(),
};

describe("humanoid graphics", () => {
  it("builds articulated human proportions with four animated limbs", () => {
    const human = createHumanoid("runner", 1, materials);
    let meshCount = 0;
    human.traverse((child) => { if (child.isMesh) meshCount += 1; });

    expect(human.userData.humanoid.detail).toBe("articulated");
    expect(human.userData.stickman.limbs).toHaveLength(4);
    expect(meshCount).toBeGreaterThanOrEqual(25);
    expect(human.userData.stickman.limbs.every((limb) => limb.userData.baseRotation)).toBe(true);
    expect(new THREE.Box3().setFromObject(human).min.y).toBeCloseTo(0, 3);
    ["face-left-eye", "face-right-eye", "face-nose", "face-mouth", "hand-left", "hand-right", "boot-left", "boot-right"].forEach((name) => {
      expect(human.getObjectByName(name)).toBeTruthy();
    });
  });

  it("uses recognizable multi-part firearms and role-specific melee weapons", () => {
    const rifle = createInfantryRifle(materials.gear, materials.gear);
    expect(rifle.children.length).toBeGreaterThanOrEqual(8);
    expect(rifle.userData.gear).toBe("rifle");
    ["rifle-stock", "rifle-receiver", "rifle-handguard", "rifle-barrel", "rifle-magazine", "rifle-grip", "rifle-sight", "rifle-muzzle"].forEach((name) => {
      expect(rifle.getObjectByName(name)).toBeTruthy();
    });
    ["sword", "knife", "hammer", "staff", "gauntlet"].forEach((kind) => {
      expect(createMeleeWeapon(kind, materials).userData.gear).toBe(kind);
    });
  });

  it("sockets weapons to hands or a supported two-hand firing pose", () => {
    const human = createHumanoid("runner", 1, materials);
    const rifle = createInfantryRifle(materials.gear, materials.gear);
    equipHumanoid(human, rifle, { pose: "rifle" });
    expect(rifle.parent?.name).toBe("equipment-rifle-socket");
    expect(human.userData.humanoid.rig.equipmentPose).toBe("rifle");
    expectHandsInFrontOfShoulders(human);

    const sword = createMeleeWeapon("sword", materials);
    equipHumanoid(human, sword, { hand: "right", pose: "melee" });
    expect(sword.parent?.name).toBe("hand-right-socket");
  });

  it("supports stable forward, backward, leftward, and rightward motion", () => {
    const human = createHumanoid("runner", 1, materials);
    const rig = human.userData.humanoid.rig;
    const poses = [HUMANOID_MOTION.FORWARD, HUMANOID_MOTION.BACKWARD, HUMANOID_MOTION.LEFT, HUMANOID_MOTION.RIGHT];
    poses.forEach((motion, index) => {
      animateHumanoid(human, motion, 0.35 + index * 0.11);
      expect(human.userData.humanoid.motion).toBe(motion);
      expect(Number.isFinite(rig.body.rotation.z)).toBe(true);
      expect(Number.isFinite(rig.legs[0].rotation.x)).toBe(true);
      expect(new THREE.Box3().setFromObject(human).min.y).toBeCloseTo(0, 3);
    });
    expect(resolveHumanoidMotion({ x: 0, z: 2 }, { x: 0.2, z: 2 })).toBe(HUMANOID_MOTION.RIGHT);
    expect(resolveHumanoidMotion({ x: 0, z: 2 }, { x: -0.2, z: 2 })).toBe(HUMANOID_MOTION.LEFT);
    expect(resolveHumanoidMotion({ x: 0, z: 2 }, { x: 0, z: 1.8 })).toBe(HUMANOID_MOTION.FORWARD);
    expect(resolveHumanoidMotion({ x: 0, z: 2 }, { x: 0, z: 2.2 })).toBe(HUMANOID_MOTION.BACKWARD);
  });

  it("keeps every friendly and hostile body archetype grounded across the direction grid", () => {
    const poses = [HUMANOID_MOTION.FORWARD, HUMANOID_MOTION.BACKWARD, HUMANOID_MOTION.LEFT, HUMANOID_MOTION.RIGHT];
    ["ally", "runner", "sprinter", "shield", "brute"].forEach((kind, roleIndex) => {
      const human = createHumanoid(kind, kind === "brute" ? 1.8 : 1, materials);
      poses.forEach((motion, motionIndex) => {
        animateHumanoid(human, motion, roleIndex + motionIndex * 0.19);
        const bounds = new THREE.Box3().setFromObject(human);
        expect(bounds.min.y).toBeCloseTo(0, 3);
        expect(Number.isFinite(bounds.max.y)).toBe(true);
      });
    });
  });
});

function expectHandsInFrontOfShoulders(human) {
  human.updateMatrixWorld(true);
  ["left", "right"].forEach((side) => {
    const shoulder = human.getObjectByName(`arm-${side}`).getWorldPosition(new THREE.Vector3());
    const elbow = human.getObjectByName(`elbow-${side}`).getWorldPosition(new THREE.Vector3());
    const hand = human.getObjectByName(`hand-${side}`).getWorldPosition(new THREE.Vector3());
    expect(elbow.z).toBeLessThan(shoulder.z - 0.03);
    expect(hand.z).toBeLessThan(shoulder.z - 0.08);
  });
}
