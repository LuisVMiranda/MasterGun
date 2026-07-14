import * as THREE from "three";
import { addCylinder, addRoundedBox, addSocket } from "../assets/proceduralGeometry.js";
import { createApprovedMaterials } from "../assets/approvedMaterials.js";

export const APPROVED_WEAPON_IDS = Object.freeze(["pistol", "shotgun", "machineGun", "rifle"]);

export function createApprovedWeapon(weaponId = "pistol", options = {}) {
  const group = new THREE.Group();
  const materials = options.materials ?? createApprovedMaterials();
  const build = BUILDERS[weaponId] ?? buildPistol;
  build(group, materials);
  addWeaponSockets(group, weaponId);
  group.scale.setScalar(options.scale ?? 1);
  group.userData.approvedAsset = true;
  group.userData.weaponId = weaponId;
  group.userData.animation = { recoil: 0 };
  return group;
}

export function animateApprovedWeapon(group, time, firing = false) {
  const pulse = firing ? (Math.sin(time * 28) + 1) * 0.5 : 0;
  const recoil = pulse * getRecoil(group.userData.weaponId);
  group.position.z = (group.userData.baseZ ?? 0) - recoil;
  const slide = group.getObjectByName("slide");
  if (slide) slide.position.z = (slide.userData.baseZ ?? slide.position.z) - recoil * 1.5;
}

function buildPistol(group, material) {
  addRoundedBox(group, part([0.34, 0.16, 0.86], [0, 0.49, 0.2], material.steelLight, "slide", 0.035));
  addRoundedBox(group, part([0.29, 0.12, 0.58], [0, 0.36, 0.06], material.olive, "frame", 0.03));
  addRoundedBox(group, rotatedPart([0.22, 0.61, 0.26], [0, 0.04, -0.2], [-0.32, 0, 0], material.rubber, "grip"));
  addRoundedBox(group, part([0.22, 0.07, 0.22], [0.17, 0.5, 0.16], material.steel, "ejection-port", 0.012));
  addCylinder(group, cylinder(0.048, 0.92, [0, 0.48, 0.54], material.steel, "barrel"));
  addRoundedBox(group, part([0.065, 0.07, 0.1], [0, 0.61, 0.5], material.warning, "front-sight", 0.012));
  addRoundedBox(group, part([0.17, 0.07, 0.08], [0, 0.61, -0.14], material.steel, "rear-sight", 0.012));
  addTriggerGuard(group, material.steel, [0, 0.23, 0.06], 0.145);
}

function buildShotgun(group, material) {
  addRoundedBox(group, part([0.56, 0.3, 0.72], [0, 0.42, 0.05], material.steel, "receiver", 0.055));
  addCylinder(group, cylinder(0.075, 1.62, [0, 0.54, 1.05], material.steelLight, "barrel"));
  addCylinder(group, cylinder(0.055, 1.3, [0, 0.36, 0.91], material.steel, "tube"));
  addRoundedBox(group, part([0.54, 0.22, 0.48], [0, 0.34, 0.55], material.olive, "pump", 0.06));
  addRoundedBox(group, rotatedPart([0.48, 0.42, 0.92], [0, 0.3, -0.7], [-0.12, 0, 0], material.tan, "stock"));
  addRoundedBox(group, part([0.07, 0.07, 0.1], [0, 0.65, 1.75], material.warning, "bead", 0.015));
  addTriggerGuard(group, material.steelLight, [0, 0.23, 0.04], 0.2);
}

function buildMachineGun(group, material) {
  addRoundedBox(group, part([0.58, 0.34, 0.82], [0, 0.42, 0.02], material.olive, "receiver", 0.055));
  addRoundedBox(group, part([0.5, 0.28, 0.72], [0, 0.43, 0.72], material.steel, "handguard", 0.05));
  addCylinder(group, cylinder(0.052, 1.25, [0, 0.49, 1.52], material.steelLight, "barrel"));
  addRoundedBox(group, rotatedPart([0.26, 0.68, 0.34], [0, 0.02, 0], [-0.12, 0, 0], material.steel, "magazine"));
  addRoundedBox(group, rotatedPart([0.44, 0.4, 0.74], [0, 0.32, -0.66], [-0.08, 0, 0], material.rubber, "stock"));
  addRoundedBox(group, rotatedPart([0.2, 0.44, 0.22], [0, 0.11, 0.5], [-0.22, 0, 0], material.rubber, "foregrip"));
  addSightRail(group, material);
  addMuzzleBrake(group, material, 2.13);
}

function buildRifle(group, material) {
  addRoundedBox(group, part([0.46, 0.28, 1.02], [0, 0.4, 0.08], material.tan, "receiver", 0.05));
  addRoundedBox(group, part([0.42, 0.22, 0.96], [0, 0.42, 0.92], material.olive, "handguard", 0.045));
  addCylinder(group, cylinder(0.035, 1.62, [0, 0.46, 2.02], material.steelLight, "barrel"));
  addRoundedBox(group, rotatedPart([0.42, 0.38, 0.84], [0, 0.3, -0.78], [-0.08, 0, 0], material.rubber, "stock"));
  addRoundedBox(group, rotatedPart([0.25, 0.55, 0.3], [0, 0.03, 0.08], [-0.18, 0, 0], material.steel, "magazine"));
  addScope(group, material);
  addMuzzleBrake(group, material, 2.84);
}

function addScope(group, material) {
  addCylinder(group, cylinder(0.105, 0.72, [0, 0.77, 0.42], material.steel, "scope"));
  addCylinder(group, cylinder(0.14, 0.16, [0, 0.77, 0.1], material.glass, "scope-lens"));
  addRoundedBox(group, part([0.12, 0.18, 0.12], [0, 0.63, 0.18], material.steel, "scope-mount", 0.02));
  addRoundedBox(group, part([0.12, 0.18, 0.12], [0, 0.63, 0.64], material.steel, "scope-mount", 0.02));
}

function addSightRail(group, material) {
  addRoundedBox(group, part([0.18, 0.06, 0.9], [0, 0.64, 0.42], material.steelLight, "rail", 0.012));
  addRoundedBox(group, part([0.16, 0.16, 0.08], [0, 0.73, 0.78], material.warning, "sight", 0.02));
}

function addTriggerGuard(group, material, position, radius) {
  const guard = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.026, 6, 18, Math.PI * 1.55), material);
  guard.position.set(...position);
  guard.rotation.y = Math.PI / 2;
  guard.rotation.z = 0.7;
  guard.castShadow = true;
  group.add(guard);
}

function addMuzzleBrake(group, material, z) {
  addCylinder(group, cylinder(0.085, 0.24, [0, 0.48, z], material.steel, "muzzle-brake"));
}

function addWeaponSockets(group, weaponId) {
  const length = { pistol: 1.02, shotgun: 1.88, machineGun: 2.28, rifle: 2.97 }[weaponId] ?? 1;
  addSocket(group, "muzzle", [0, 0.48, length]);
  addSocket(group, "eject", [0.28, 0.48, 0.22]);
  addSocket(group, "grip_primary", [0, 0.08, -0.12]);
  addSocket(group, "grip_support", [0, 0.26, Math.min(0.72, length * 0.38)]);
  addSocket(group, "shadow_anchor", [0, 0, 0.42]);
  group.getObjectByName("slide")?.userData && (group.getObjectByName("slide").userData.baseZ = 0.2);
}

function getRecoil(weaponId) {
  return { pistol: 0.08, shotgun: 0.2, machineGun: 0.045, rifle: 0.13 }[weaponId] ?? 0.08;
}

function part(size, position, material, name, radius = 0.035) {
  return { size, position, material, name, radius };
}

function rotatedPart(size, position, rotation, material, name) {
  return { ...part(size, position, material, name), rotation };
}

function cylinder(radius, length, position, material, name) {
  return { radius, length, position, rotation: [Math.PI / 2, 0, 0], material, name, segments: 14 };
}

const BUILDERS = Object.freeze({ pistol: buildPistol, shotgun: buildShotgun, machineGun: buildMachineGun, rifle: buildRifle });
