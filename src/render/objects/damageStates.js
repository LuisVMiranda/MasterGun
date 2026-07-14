import { ENTITY } from "../../game/content/constants.js";
import * as THREE from "three";

const DAMAGEABLE_STRUCTURES = new Set([ENTITY.BARRICADE, ENTITY.SOLID_WALL, ENTITY.FINISH_BLOCK]);
const crackMaterial = new THREE.MeshBasicMaterial({ color: "#17202c", depthWrite: false, opacity: 0, transparent: true });
const criticalMaterial = new THREE.MeshBasicMaterial({ color: "#0b1119", depthWrite: false, opacity: 0, transparent: true });
const crackGeometry = Array.from({ length: 7 }, (_, index) => new THREE.BoxGeometry(0.035, 0.55 - index * 0.035, 0.02));
const chipGeometry = new THREE.BoxGeometry(0.2, 0.16, 0.1);

export function attachDamageVisual(object, entity) {
  if (!DAMAGEABLE_STRUCTURES.has(entity.type)) return;
  const cracked = createCracks(crackMaterial, false);
  const critical = createCracks(criticalMaterial, true);
  object.add(cracked, critical);
  object.userData.damageVisual = { cracked, critical };
}

export function updateDamageVisual(object, entity) {
  const visual = object.userData.damageVisual;
  if (!visual || !entity.maxHealth) return;
  const ratio = Math.max(0, entity.health / entity.maxHealth);
  setOpacity(visual.cracked, fadeBelow(ratio, 0.58, 0.48));
  setOpacity(visual.critical, fadeBelow(ratio, 0.25, 0.15));
}

function createCracks(material, critical) {
  const group = new THREE.Group();
  const lines = critical ? 7 : 4;
  const stateMaterial = material.clone();
  for (let index = 0; index < lines; index += 1) {
    const segment = new THREE.Mesh(crackGeometry[index], stateMaterial);
    const side = index % 2 ? -1 : 1;
    segment.position.set(side * (0.12 + index * 0.075), 0.78 + (index % 3) * 0.12, -0.43);
    segment.rotation.z = side * (0.42 + index * 0.08);
    segment.userData.skipOutline = true;
    group.add(segment);
  }
  if (critical) addChippedCorners(group, stateMaterial);
  group.userData.dispose = () => stateMaterial.dispose();
  return group;
}

function addChippedCorners(group, material) {
  [-1, 1].forEach((side) => {
    const chip = new THREE.Mesh(chipGeometry, material);
    chip.position.set(side * 0.68, 0.18, -0.44);
    chip.rotation.z = side * 0.3;
    chip.userData.skipOutline = true;
    group.add(chip);
  });
}

function setOpacity(group, opacity) {
  group.visible = opacity > 0;
  group.children.forEach((child) => { child.material.opacity = opacity; });
}

function fadeBelow(ratio, start, full) {
  return Math.min(0.82, Math.max(0, (start - ratio) / Math.max(0.01, start - full)) * 0.82);
}
