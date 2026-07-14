import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { addMeshOutline } from "../../src/render/objects/outline.js";
import { ENTITY } from "../../src/game/content/constants.js";
import { shouldOutlineEntity } from "../../src/render/objects/actors.js";

describe("mesh outlines", () => {
  it("does not outline internal geometry marked for exclusion", () => {
    const group = new THREE.Group();
    const exterior = createMesh();
    const internal = createMesh();
    internal.userData.skipOutline = true;
    group.add(exterior, internal);

    addMeshOutline(group);

    expect(exterior.userData.hasOutline).toBe(true);
    expect(internal.userData.hasOutline).toBeUndefined();
    expect(group.children.filter((child) => child.userData.isOutline)).toHaveLength(1);
  });

  it("removes white mesh outlines from green and red pickup assets", () => {
    const entities = [
      { type: ENTITY.GATE, gateType: "buff", label: "Power", health: 1, maxHealth: 1 },
      { type: ENTITY.GATE, gateType: "debuff", label: "Reload", health: 1, maxHealth: 1 },
      { type: ENTITY.PICKUP, stat: "ammo", label: "Ammo", health: 1, maxHealth: 1 },
      { type: ENTITY.HAZARD, label: "Thin shots", health: 1, maxHealth: 1 },
    ];

    expect(entities.every((entity) => !shouldOutlineEntity(entity))).toBe(true);
  });
});

function createMesh() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "#22dd66" }),
  );
}
