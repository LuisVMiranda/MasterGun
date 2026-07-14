import * as THREE from "three";
import { createContactShadowMesh } from "./shadows.js";

const SHADOW_OPACITY = 0.115;
const SHADOW_Y = -0.11;
const DOUBLE_OFFSETS = Object.freeze([-0.34, 0.34]);
const SILHOUETTES = Object.freeze({
  pistol: Object.freeze([
    part(0, 0.22, 0.2, 0.56),
    part(0, -0.24, 0.15, 0.3),
  ]),
  shotgun: Object.freeze([
    part(0, 0.46, 0.24, 1.02),
    part(0, -0.36, 0.33, 0.42),
  ]),
  machineGun: Object.freeze([
    part(0, 0.3, 0.29, 0.84),
    part(0.28, 0.02, 0.21, 0.23),
    part(0, -0.3, 0.21, 0.36),
  ]),
  rifle: Object.freeze([
    part(0, 0.52, 0.2, 1.18),
    part(0, -0.4, 0.29, 0.46),
    part(0, 0.14, 0.3, 0.2),
  ]),
});

export function setWeaponContactShadow(root, weaponId, doubleWeapon) {
  const previous = root.userData.contactShadow;
  if (previous) root.remove(previous);

  const group = new THREE.Group();
  const offsets = doubleWeapon ? DOUBLE_OFFSETS : [0];
  offsets.forEach((offset) => addSilhouette(group, weaponId, offset));
  group.position.y = SHADOW_Y;
  group.userData.isContactShadow = true;
  group.userData.weaponId = weaponId;
  root.userData.contactShadow = group;
  root.add(group);
}

function addSilhouette(group, weaponId, offsetX) {
  const parts = SILHOUETTES[weaponId] ?? SILHOUETTES.pistol;
  parts.forEach((shape) => {
    const mesh = createContactShadowMesh({
      opacity: SHADOW_OPACITY,
      radiusX: shape.radiusX,
      radiusZ: shape.radiusZ,
      y: 0,
    });
    mesh.position.x = offsetX + shape.x;
    mesh.position.z = shape.z;
    group.add(mesh);
  });
}

function part(x, z, radiusX, radiusZ) {
  return { x, z, radiusX, radiusZ };
}
