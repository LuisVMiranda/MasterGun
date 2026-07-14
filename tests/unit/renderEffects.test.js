import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createBulletObject } from "../../src/render/objects/actors.js";
import { createSpecialAimGuide, updateSpecialAimGuide } from "../../src/render/objects/specialAim.js";
import { getReloadPose } from "../../src/render/objects/weaponAnimation.js";

describe("temporary effect rendering", () => {
  it("uses dedicated narrow geometry for thin projectiles", () => {
    const regular = createBulletObject({ owner: "player" });
    const thin = createBulletObject({ owner: "player", thin: true });
    const regularCore = regular.children[0];
    const thinCore = thin.children[0];
    regularCore.geometry.computeBoundingBox();
    thinCore.geometry.computeBoundingBox();

    const regularWidth = regularCore.geometry.boundingBox.max.x - regularCore.geometry.boundingBox.min.x;
    const thinWidth = thinCore.geometry.boundingBox.max.x - thinCore.geometry.boundingBox.min.x;
    expect(thin.userData.thinProjectile).toBe(true);
    expect(thinWidth).toBeLessThan(regularWidth * 0.4);
  });

  it("creates a visible reload pose during the effect", () => {
    const pose = getReloadPose({ duration: 3, remaining: 2.25 });
    expect(Math.abs(pose.rotationZ)).toBeGreaterThan(0.1);
    expect(pose.y).toBeLessThan(-0.1);
    expect(getReloadPose(null)).toEqual({ rotationZ: 0, y: 0 });
  });

  it("widens the dashed special-shot trajectory toward its endpoint", () => {
    const scene = new THREE.Scene();
    const guide = createSpecialAimGuide(scene);
    const run = { player: { x: 0 }, specialShot: { active: true, aimX: 2, lockedX: null, range: 56 } };

    updateSpecialAimGuide(guide, run);

    expect(guide.group.visible).toBe(true);
    expect(guide.dashes.at(-1).scale.x).toBeGreaterThan(guide.dashes[0].scale.x * 5);
    expect(guide.dashes.at(-1).scale.z).toBeGreaterThan(0.7);
  });
});
