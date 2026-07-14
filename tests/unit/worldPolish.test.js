import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ENTITY } from "../../src/game/content/constants.js";
import { attachDamageVisual, updateDamageVisual } from "../../src/render/objects/damageStates.js";
import { createRunwayGrass, updateRunwayGrass } from "../../src/render/objects/world.js";

describe("world polish", () => {
  it("fades structural cracks in at half health and deepens them near defeat", () => {
    const object = new THREE.Group();
    const entity = { type: ENTITY.SOLID_WALL, health: 100, maxHealth: 100 };
    attachDamageVisual(object, entity);
    updateDamageVisual(object, entity);
    const visual = object.userData.damageVisual;

    expect(visual.cracked.visible).toBe(false);
    entity.health = 45;
    updateDamageVisual(object, entity);
    expect(visual.cracked.visible).toBe(true);
    expect(visual.critical.visible).toBe(false);
    entity.health = 10;
    updateDamageVisual(object, entity);
    expect(visual.critical.visible).toBe(true);
  });

  it("uses one noninteractive instanced mesh for subtle runway grass", () => {
    const grass = createRunwayGrass();
    const before = grass.instanceMatrix.version;
    updateRunwayGrass(grass, 37);

    expect(grass).toBeInstanceOf(THREE.InstancedMesh);
    expect(grass.count).toBe(48);
    expect(grass.instanceMatrix.version).toBeGreaterThan(before);
    expect(grass.material.opacity).toBeLessThan(0.7);
  });
});
