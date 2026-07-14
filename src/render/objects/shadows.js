import * as THREE from "three";
import { ENTITY } from "../../game/content/constants.js";

const contactGeometry = new THREE.CircleGeometry(1, 28);
const contactMaterials = new Map();

const ENTITY_SHADOWS = Object.freeze({
  [ENTITY.ENEMY]: style(0.23, 0.42, 0.64, true),
  [ENTITY.SHOOTER]: style(0.24, 0.48, 0.7, true),
  [ENTITY.BOSS]: style(0.31, 0.88, 1.18, true),
  [ENTITY.BARRICADE]: style(0.075, 0.72, 0.48),
  [ENTITY.SOLID_WALL]: style(0.07, 0.7, 0.52),
  [ENTITY.FINISH_BLOCK]: style(0.065, 0.58, 0.46),
  [ENTITY.GATE]: style(0.055, 0.8, 0.38),
  [ENTITY.HAZARD]: style(0.055, 0.52, 0.38),
  [ENTITY.PICKUP]: style(0.075, 0.34, 0.3),
  [ENTITY.WEAPON_PICKUP]: style(0.085, 0.48, 0.38),
  [ENTITY.CASH]: style(0.065, 0.26, 0.22),
  [ENTITY.RECRUITER]: style(0.07, 0.66, 0.42),
});

export const SOLDIER_SHADOW = Object.freeze(style(0.2, 0.34, 0.5, true, -0.075));

export function applyEntityShadow(root, entity) {
  const shadowStyle = getEntityShadowStyle(entity.type);
  addContactShadow(root, shadowStyle);
  if (shadowStyle.casts) enableShadowCasting(root);
  return root;
}

export function addContactShadow(root, shadowStyle) {
  if (!shadowStyle || shadowStyle.opacity <= 0) return root;

  const shadow = createContactShadowMesh(shadowStyle);
  root.userData.contactShadow = shadow;
  root.add(shadow);
  return root;
}

export function createContactShadowMesh(shadowStyle) {
  const shadow = new THREE.Mesh(contactGeometry, getContactMaterial(shadowStyle.opacity));
  shadow.position.y = shadowStyle.y;
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(shadowStyle.radiusX, shadowStyle.radiusZ, 1);
  shadow.renderOrder = 2;
  shadow.userData.isContactShadow = true;
  return shadow;
}

export function enableShadowCasting(root) {
  root.traverse((child) => {
    if (!isOpaqueRenderableMesh(child)) return;
    child.castShadow = true;
  });
  return root;
}

export function getEntityShadowStyle(type) {
  return ENTITY_SHADOWS[type] ?? style(0.05, 0.4, 0.3);
}

function isOpaqueRenderableMesh(child) {
  if (!child.isMesh || child.userData.isContactShadow || child.userData.isOutline) return false;
  if (child.material?.depthTest === false) return false;
  return !child.material?.transparent && child.material?.opacity !== 0;
}

function getContactMaterial(opacity) {
  const key = opacity.toFixed(3);
  if (contactMaterials.has(key)) return contactMaterials.get(key);

  const material = new THREE.MeshBasicMaterial({
    color: "#18333c",
    depthWrite: false,
    opacity,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
  });
  contactMaterials.set(key, material);
  return material;
}

function style(opacity, radiusX, radiusZ, casts = false, y = -0.03) {
  return { opacity, radiusX, radiusZ, casts, y };
}
