import * as THREE from "three";
import { addCapsule, addRoundedBox, addSocket, addSphere } from "../assets/proceduralGeometry.js";
import { createApprovedMaterials } from "../assets/approvedMaterials.js";
import { createApprovedWeapon } from "./approvedWeapons.js";

export function createApprovedOperator(options = {}) {
  const faction = options.faction ?? "enemy";
  const materials = createApprovedMaterials(faction);
  const root = new THREE.Group();
  const body = new THREE.Group();
  const torso = createTorso(materials);
  const head = createHead(materials);
  const arms = createArms(materials);
  const legs = createLegs(materials);
  const weapon = createApprovedWeapon(options.weaponId ?? "machineGun", { materials, scale: 0.31 });

  weapon.position.set(0.05, 1.08, -0.48);
  weapon.rotation.x = -0.08;
  weapon.rotation.y = Math.PI;
  body.add(torso, head, ...arms, ...legs, weapon);
  const groundY = getGroundLift(body);
  body.position.y = groundY;
  root.add(body);
  addSocket(root, "muzzle", [0.05, 1.22 + groundY, -1.18]);
  addSocket(root, "grip_primary", [0.12, 1.08 + groundY, -0.22]);
  addSocket(root, "grip_support", [-0.12, 1.03 + groundY, -0.5]);
  addSocket(root, "shadow_anchor", [0, 0.02, 0]);
  root.userData.approvedAsset = true;
  root.userData.operator = { arms, body, faction, groundY, head, legs, weapon };
  root.userData.animation = "idle";
  root.scale.setScalar(options.scale ?? 1);
  return root;
}

export function animateApprovedOperator(operator, animation, time) {
  const rig = operator.userData.operator;
  if (!rig) return;
  resetRig(rig);
  const animator = ANIMATORS[animation] ?? animateIdle;
  animator(rig, time);
  operator.userData.animation = animation;
}

function createTorso(materials) {
  const torso = new THREE.Group();
  addCapsule(torso, { ...capsule(0.2, 0.34, [0, 1.06, 0], materials.faction, "torso"), scale: [1.18, 1, 0.76] });
  addRoundedBox(torso, box([0.4, 0.3, 0.09], [0, 1.13, -0.18], materials.armor, "chest-plate", 0.045));
  addRoundedBox(torso, box([0.38, 0.16, 0.26], [0, 0.72, 0], materials.faction, "pelvis", 0.05));
  addRoundedBox(torso, box([0.44, 0.07, 0.28], [0, 0.82, 0], materials.rubber, "belt", 0.025));
  addRoundedBox(torso, box([0.11, 0.14, 0.09], [-0.15, 0.82, -0.18], materials.armorMid, "pouch", 0.02));
  addRoundedBox(torso, box([0.11, 0.14, 0.09], [0.15, 0.82, -0.18], materials.armorMid, "pouch", 0.02));
  return torso;
}

function createHead(materials) {
  const head = new THREE.Group();
  addCapsule(head, capsule(0.145, 0.11, [0, 1.55, 0], materials.skin, "head"));
  const helmet = addSphere(head, sphere(0.195, [0, 1.66, 0.015], materials.faction, "helmet"));
  helmet.scale.set(1.04, 0.72, 1);
  addRoundedBox(head, box([0.235, 0.055, 0.045], [0, 1.59, -0.16], materials.glass, "visor", 0.02));
  addRoundedBox(head, box([0.19, 0.055, 0.055], [0, 1.48, -0.13], materials.armor, "chin-guard", 0.02));
  addRoundedBox(head, box([0.075, 0.08, 0.1], [0.18, 1.65, 0.01], materials.armorMid, "comms", 0.02));
  return head;
}

function createArms(materials) {
  return [createArm(-1, materials), createArm(1, materials)];
}

function createArm(side, materials) {
  const arm = new THREE.Group();
  const forearm = new THREE.Group();
  const upper = addCapsule(arm, capsule(0.07, 0.22, [0, -0.17, 0], materials.faction, "upper-arm"));
  const elbow = addSphere(arm, sphere(0.068, [0, -0.35, 0], materials.armor, "elbow"));
  const lower = addCapsule(forearm, capsule(0.061, 0.21, [0, -0.15, 0], materials.faction, "forearm"));
  const hand = addSphere(forearm, sphere(0.065, [0, -0.34, 0], materials.skin, "hand"));
  addRoundedBox(arm, box([0.15, 0.14, 0.14], [0, -0.04, 0], materials.armor, "shoulder-pad", 0.05));
  forearm.position.set(0, -0.34, 0);
  arm.add(forearm);
  arm.position.set(side * 0.28, 1.34, 0);
  aimArmAtGrip(arm, forearm, side);
  arm.userData.parts = { elbow, forearm, hand, lower, upper };
  arm.userData.baseRotation = arm.rotation.clone();
  forearm.userData.baseRotation = forearm.rotation.clone();
  return arm;
}

function aimArmAtGrip(arm, forearm, side) {
  const shoulder = arm.position.clone();
  const target = side < 0 ? new THREE.Vector3(-0.12, 1.03, -0.5) : new THREE.Vector3(0.12, 1.08, -0.22);
  const direction = target.clone().sub(shoulder);
  const distance = Math.min(direction.length(), 0.66);
  direction.normalize();
  const along = distance * 0.5;
  const bend = new THREE.Vector3(side, -0.25, -0.2).normalize();
  const elbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(0.33 ** 2 - along ** 2));
  const upperDirection = elbow.clone().sub(shoulder).normalize();
  const lowerDirection = target.clone().sub(elbow).normalize();
  arm.quaternion.setFromUnitVectors(DOWN, upperDirection);
  const lowerWorld = new THREE.Quaternion().setFromUnitVectors(DOWN, lowerDirection);
  forearm.quaternion.copy(arm.quaternion).invert().multiply(lowerWorld);
}

function createLegs(materials) {
  return [createLeg(-1, materials), createLeg(1, materials)];
}

function createLeg(side, materials) {
  const leg = new THREE.Group();
  const lowerLeg = new THREE.Group();
  addCapsule(leg, capsule(0.087, 0.27, [0, -0.2, 0], materials.faction, "thigh"));
  addSphere(leg, sphere(0.074, [0, -0.41, 0], materials.armor, "knee"));
  addCapsule(lowerLeg, capsule(0.068, 0.27, [0, -0.18, 0], materials.faction, "shin"));
  addRoundedBox(lowerLeg, box([0.18, 0.12, 0.31], [0, -0.37, -0.08], materials.rubber, "boot", 0.045));
  addRoundedBox(lowerLeg, box([0.135, 0.17, 0.1], [0, -0.13, -0.075], materials.armor, "shin-guard", 0.03));
  lowerLeg.position.set(0, -0.42, 0);
  lowerLeg.rotation.x = side * 0.08;
  leg.add(lowerLeg);
  leg.position.set(side * 0.13, 0.78, 0);
  leg.rotation.z = side * 0.06;
  leg.userData.basePosition = leg.position.clone();
  leg.userData.baseRotation = leg.rotation.clone();
  return leg;
}

function animateIdle(rig, time) {
  rig.body.position.y = rig.groundY;
  rig.head.rotation.y = Math.sin(time * 0.7) * 0.05;
}

function animateAim(rig, time) {
  animateIdle(rig, time);
  rig.arms[0].rotation.x -= 0.035;
  rig.arms[1].rotation.x -= 0.025;
}

function animateRun(rig, time) {
  const swing = Math.sin(time * 7.5) * 0.68;
  rig.body.position.y = rig.groundY + Math.abs(Math.sin(time * 7.5)) * 0.055;
  rig.body.rotation.x = -0.1;
  rig.legs[0].rotation.x = swing;
  rig.legs[1].rotation.x = -swing;
  rig.arms[0].rotation.x += swing * 0.04;
  rig.arms[1].rotation.x -= swing * 0.04;
}

function animateStrafe(rig, time, direction) {
  animateAim(rig, time);
  const step = Math.sin(time * 6.4);
  const lift = Math.max(0, Math.sin(time * 6.4 + Math.PI * 0.5));
  rig.body.position.x = direction * step * 0.035;
  rig.body.position.y = rig.groundY + lift * 0.035;
  rig.body.rotation.z = direction * -0.1;
  rig.head.rotation.y = direction * -0.08;
  rig.legs[0].rotation.x = step * 0.2;
  rig.legs[1].rotation.x = -step * 0.2;
  rig.legs[0].rotation.z += direction * (0.2 + step * 0.24);
  rig.legs[1].rotation.z += direction * (0.2 - step * 0.24);
  rig.legs[0].position.x += direction * step * 0.075;
  rig.legs[1].position.x -= direction * step * 0.075;
}

function animateStrafeLeft(rig, time) {
  animateStrafe(rig, time, -1);
}

function animateStrafeRight(rig, time) {
  animateStrafe(rig, time, 1);
}

function animateFire(rig, time) {
  animateAim(rig, time);
  const recoil = (Math.sin(time * 28) + 1) * 0.5;
  rig.weapon.position.z = -0.48 + recoil * 0.06;
  rig.body.rotation.x = recoil * 0.018;
}

function animateReload(rig, time) {
  const cycle = Math.sin(time * 2.4);
  rig.weapon.rotation.z = -0.55;
  rig.weapon.position.y = 0.94 + cycle * 0.06;
  rig.arms[0].rotation.x += cycle * 0.08;
}

function resetRig(rig) {
  rig.body.position.set(0, rig.groundY, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.weapon.position.set(0.05, 1.08, -0.48);
  rig.weapon.rotation.set(-0.08, Math.PI, 0);
  [...rig.arms, ...rig.legs].forEach((limb) => limb.rotation.copy(limb.userData.baseRotation));
  rig.arms.forEach((arm) => arm.userData.parts.forearm.rotation.copy(arm.userData.parts.forearm.userData.baseRotation));
  rig.legs.forEach((leg) => leg.position.copy(leg.userData.basePosition));
}

function getGroundLift(body) {
  const bounds = new THREE.Box3().setFromObject(body);
  return -bounds.min.y;
}

function box(size, position, material, name, radius) {
  return { size, position, material, name, radius };
}

function capsule(radius, length, position, material, name) {
  return { radius, length, position, material, name };
}

function sphere(radius, position, material, name) {
  return { radius, position, material, name };
}

const ANIMATORS = Object.freeze({
  idle: animateIdle,
  aim: animateAim,
  run: animateRun,
  strafeLeft: animateStrafeLeft,
  strafeRight: animateStrafeRight,
  fire: animateFire,
  reload: animateReload,
});

const DOWN = new THREE.Vector3(0, -1, 0);
