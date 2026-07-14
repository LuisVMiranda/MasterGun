import * as THREE from "three";

const geometry = {
  head: new THREE.SphereGeometry(0.205, 20, 16),
  helmet: new THREE.SphereGeometry(0.225, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
  neck: new THREE.CylinderGeometry(0.065, 0.075, 0.13, 10),
  shoulder: new THREE.CapsuleGeometry(0.072, 0.4, 5, 10),
  hand: new THREE.SphereGeometry(0.071, 12, 9),
  joint: new THREE.SphereGeometry(0.07, 10, 8),
  foot: new THREE.BoxGeometry(0.19, 0.12, 0.32),
  armUpper: new THREE.CylinderGeometry(0.054, 0.07, 0.31, 10),
  armLower: new THREE.CylinderGeometry(0.046, 0.059, 0.29, 10),
  legUpper: new THREE.CylinderGeometry(0.07, 0.092, 0.36, 12),
  legLower: new THREE.CylinderGeometry(0.054, 0.072, 0.34, 10),
  torso: new THREE.CylinderGeometry(0.18, 0.235, 0.65, 16),
  vest: new THREE.CylinderGeometry(0.125, 0.16, 0.3, 8),
};

export function createHumanoid(kind, scale, materials) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const material = getMaterial(materials, kind, "runner");
  const build = getBuild(kind);
  const torso = createTorso(material, materials, build);
  const head = createHead(material, materials, build);
  const arms = [createArm("left", material, materials), createArm("right", material, materials)];
  const legs = [createLeg("left", material, materials), createLeg("right", material, materials)];
  const weaponSocket = createWeaponSocket();

  body.name = "humanoid-body";
  body.scale.set(scale * build.width, scale, scale);
  body.add(torso, head, ...arms, ...legs, weaponSocket);
  const groundY = alignBodyToGround(body);
  group.add(body);
  body.traverse((child) => { if (child.isMesh) child.castShadow = true; });

  const feet = legs.map((leg, index) => leg.getObjectByName(`boot-${index ? "right" : "left"}`));
  const rig = { arms, body, equipmentPose: "unarmed", feet, groundY, head, legs, weaponSocket };
  group.name = `humanoid-${kind}`;
  group.userData.stickman = { limbs: [...arms, ...legs], rig };
  group.userData.humanoid = { detail: "articulated", height: getHeight(group), kind, motion: "idle", rig };
  return group;
}

export function createInfantryRifle(material, accentMaterial) {
  const rifle = new THREE.Group();
  addPart(rifle, new THREE.BoxGeometry(0.18, 0.15, 0.28), material, part("rifle-stock", [0, 0, 0.27]));
  addPart(rifle, new THREE.BoxGeometry(0.18, 0.18, 0.36), material, part("rifle-receiver", [0, 0, -0.02]));
  addPart(rifle, new THREE.BoxGeometry(0.15, 0.12, 0.29), accentMaterial, part("rifle-handguard", [0, 0, -0.34]));
  addPart(rifle, new THREE.CylinderGeometry(0.025, 0.032, 0.48, 10), accentMaterial, part("rifle-barrel", [0, 0, -0.68], [Math.PI / 2, 0, 0]));
  addPart(rifle, new THREE.CylinderGeometry(0.04, 0.04, 0.1, 10), material, part("rifle-muzzle", [0, 0, -0.97], [Math.PI / 2, 0, 0]));
  addPart(rifle, new THREE.BoxGeometry(0.1, 0.23, 0.14), accentMaterial, part("rifle-magazine", [0, -0.17, -0.14], [-0.18, 0, 0]));
  addPart(rifle, new THREE.BoxGeometry(0.08, 0.2, 0.1), material, part("rifle-grip", [0, -0.14, 0.03], [-0.24, 0, 0]));
  addPart(rifle, new THREE.BoxGeometry(0.08, 0.075, 0.14), accentMaterial, part("rifle-sight", [0, 0.13, -0.08]));
  rifle.name = "equipment-rifle";
  rifle.userData.gear = "rifle";
  return rifle;
}

export function createMeleeWeapon(kind, materials) {
  const group = new THREE.Group();
  const metal = getMaterial(materials, "sword", "gear");
  const grip = getMaterial(materials, "gear", "runner");
  const builder = MELEE_BUILDERS[kind] ?? buildSword;
  builder(group, metal, grip);
  group.name = `equipment-${kind}`;
  group.userData.gear = kind;
  return group;
}

export function equipHumanoid(humanoid, equipment, options = {}) {
  const rig = humanoid.userData.humanoid?.rig;
  if (!rig || !equipment) return humanoid;
  const pose = options.pose ?? equipment.userData.gear ?? "melee";
  const hand = options.hand ?? "right";
  const socket = getEquipmentSocket(rig, pose, hand);
  socket.clear();
  socket.add(equipment);
  positionEquipment(equipment, pose, hand);
  applyEquipmentPose(rig, pose, hand);
  rig.equipmentPose = pose;
  return humanoid;
}

function createTorso(material, materials, build) {
  const group = new THREE.Group();
  group.name = "torso-rig";
  addPart(group, geometry.torso, material, part("torso", [0, 1.02, 0], null, [1, 1, 0.78]));
  addPart(group, geometry.shoulder, material, part("shoulders", [0, 1.27, 0], [0, 0, Math.PI / 2], [1, build.shoulders, 1]));
  addPart(group, geometry.vest, getMaterial(materials, "gear", "runner"), part("chest-armor", [0, 1.06, -0.1], null, [1, 1, 0.72]));
  addPart(group, new THREE.BoxGeometry(0.35, 0.17, 0.24), material, part("pelvis", [0, 0.69, 0]));
  addPart(group, new THREE.BoxGeometry(0.38, 0.07, 0.26), getMaterial(materials, "gear", "runner"), part("belt", [0, 0.78, 0]));
  return group;
}

function createHead(material, materials, build) {
  const group = new THREE.Group();
  const skin = getMaterial(materials, "skin", "runner");
  const face = getMaterial(materials, "face", "gear");
  group.name = "head-rig";
  addPart(group, geometry.head, skin, part("head", [0, 1.57, 0], null, [build.headWidth, 1, 0.93]));
  addPart(group, geometry.neck, skin, part("neck", [0, 1.36, 0]));
  addPart(group, geometry.helmet, material, part("helmet", [0, 1.66, 0.015]));
  addFaceFeature(group, new THREE.SphereGeometry(0.021, 8, 6), face, part("face-left-eye", [-0.064, 1.59, -0.193]));
  addFaceFeature(group, new THREE.SphereGeometry(0.021, 8, 6), face, part("face-right-eye", [0.064, 1.59, -0.193]));
  addFaceFeature(group, new THREE.ConeGeometry(0.034, 0.085, 8), skin, part("face-nose", [0, 1.53, -0.215], [-Math.PI / 2, 0, 0]));
  addFaceFeature(group, new THREE.BoxGeometry(0.085, 0.018, 0.018), face, part("face-mouth", [0, 1.46, -0.194]));
  addFaceFeature(group, new THREE.BoxGeometry(0.075, 0.018, 0.018), face, part("face-left-brow", [-0.065, 1.635, -0.193], [0, 0, -0.08]));
  addFaceFeature(group, new THREE.BoxGeometry(0.075, 0.018, 0.018), face, part("face-right-brow", [0.065, 1.635, -0.193], [0, 0, 0.08]));
  return group;
}

function createArm(side, material, materials) {
  return createLimb(side, material, materials, ARM_PROFILE);
}

function createLeg(side, material, materials) {
  return createLimb(side, material, materials, LEG_PROFILE);
}

function createLimb(side, material, materials, profile) {
  const limb = new THREE.Group();
  const lower = new THREE.Group();
  const left = side === "left";
  const direction = left ? -1 : 1;
  const endName = `${profile.endName}-${side}`;
  const endMaterial = getMaterial(materials, profile.endMaterial, "runner");

  limb.name = `${profile.kind}-${side}`;
  lower.name = `${profile.kind}-${side}-lower-rig`;
  addPart(limb, profile.upperGeometry, material, part(`${profile.kind}-${side}-upper`, [0, -profile.upperLength / 2, 0]));
  addPart(limb, geometry.joint, getMaterial(materials, "gear", "runner"), part(`${profile.jointName}-${side}`, [0, -profile.upperLength, 0]));
  addPart(lower, profile.lowerGeometry, material, part(`${profile.kind}-${side}-lower`, [0, -profile.lowerLength / 2, 0]));
  addPart(lower, profile.endGeometry, endMaterial, part(endName, [0, -profile.lowerLength - profile.endDrop, profile.endZ]));
  const socket = createHandSocket(side);
  if (profile.socketed) lower.add(socket);
  lower.position.y = -profile.upperLength;
  limb.position.set(direction * profile.rootX, profile.rootY, 0);
  limb.rotation.set(profile.rotationX, 0, -direction * profile.rotationZ);
  limb.userData.baseRotation = limb.rotation.clone();
  limb.userData.lower = lower;
  limb.userData.lowerBaseRotation = lower.rotation.clone();
  limb.userData.lowerReach = profile.lowerLength + profile.endDrop;
  limb.userData.socket = socket;
  limb.userData.upperLength = profile.upperLength;
  limb.userData.limbKind = profile.kind;
  limb.add(lower);
  return limb;
}

function createWeaponSocket() {
  const socket = new THREE.Group();
  socket.name = "equipment-rifle-socket";
  socket.position.set(0.04, 1.08, -0.3);
  return socket;
}

function createHandSocket(side) {
  const socket = new THREE.Group();
  socket.name = `hand-${side}-socket`;
  socket.position.set(0, -0.34, -0.02);
  return socket;
}

function positionEquipment(equipment, pose, hand) {
  equipment.position.set(0, 0, 0);
  equipment.rotation.set(0, 0, 0);
  if (pose === "rifle") return;
  equipment.position.y = -0.03;
  const angle = getMeleeAngle(equipment.userData.gear, hand);
  equipment.rotation.set(-0.12, 0, angle);
}

function getMeleeAngle(kind, hand) {
  const direction = hand === "left" ? 1 : -1;
  if (kind === "hammer") return direction * 0.58;
  if (kind === "staff") return direction * 0.3;
  return direction * 0.22;
}

function applyEquipmentPose(rig, pose, hand) {
  if (pose === "rifle") {
    setArmTarget(rig.arms[0], [-0.02, 1.06, -0.46], [-0.7, -0.4, -0.15]);
    setArmTarget(rig.arms[1], [0.09, 0.96, -0.25], [0.7, -0.45, -0.12]);
    return;
  }
  const index = hand === "left" ? 0 : 1;
  const direction = hand === "left" ? -1 : 1;
  setArmTarget(rig.arms[index], [direction * 0.34, 0.78, -0.17], [direction, -0.5, -0.1]);
}

function setArmTarget(limb, targetValues, bendValues) {
  const shoulder = limb.position.clone();
  const target = new THREE.Vector3(...targetValues);
  const direction = target.clone().sub(shoulder);
  const distance = Math.min(direction.length(), limb.userData.upperLength + limb.userData.lowerReach - 0.002);
  direction.normalize();
  const along = getElbowDistance(limb, distance);
  const bend = getBendDirection(direction, bendValues);
  const height = Math.sqrt(Math.max(0, limb.userData.upperLength ** 2 - along ** 2));
  const elbow = shoulder.clone().addScaledVector(direction, along).addScaledVector(bend, height);
  const reachableTarget = shoulder.clone().addScaledVector(direction, distance);
  const upperDirection = elbow.clone().sub(shoulder);
  const lowerDirection = reachableTarget.clone().sub(elbow);
  orientArmSegments(limb, upperDirection, lowerDirection);
}

function getElbowDistance(limb, distance) {
  const upperSquared = limb.userData.upperLength ** 2;
  const lowerSquared = limb.userData.lowerReach ** 2;
  return (upperSquared - lowerSquared + distance ** 2) / (2 * distance);
}

function getBendDirection(direction, bendValues) {
  const bend = new THREE.Vector3(...bendValues);
  bend.addScaledVector(direction, -bend.dot(direction));
  if (bend.lengthSq() < 0.0001) bend.set(1, 0, 0);
  return bend.normalize();
}

function orientArmSegments(limb, upperDirection, lowerDirection) {
  const upperRotation = new THREE.Quaternion().setFromUnitVectors(DOWN, upperDirection.normalize());
  const lowerWorldRotation = new THREE.Quaternion().setFromUnitVectors(DOWN, lowerDirection.normalize());
  const lowerRotation = upperRotation.clone().invert().multiply(lowerWorldRotation);
  limb.quaternion.copy(upperRotation);
  limb.userData.lower.quaternion.copy(lowerRotation);
  limb.userData.baseRotation.copy(limb.rotation);
  limb.userData.lowerBaseRotation.copy(limb.userData.lower.rotation);
}

function getHandSocket(rig, hand) {
  return rig.arms[hand === "left" ? 0 : 1].userData.socket;
}

function getEquipmentSocket(rig, pose, hand) {
  if (pose === "rifle") return rig.weaponSocket;
  return getHandSocket(rig, hand);
}

function buildSword(group, metal, grip) {
  addPart(group, new THREE.BoxGeometry(0.065, 0.56, 0.035), metal, part("sword-blade", [0, 0.37, 0]));
  addPart(group, new THREE.ConeGeometry(0.055, 0.12, 4), metal, part("sword-tip", [0, 0.71, 0]));
  addPart(group, new THREE.BoxGeometry(0.23, 0.045, 0.055), grip, part("sword-guard", [0, 0.07, 0]));
  addPart(group, new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8), grip, part("sword-grip", [0, -0.06, 0]));
}

function buildKnife(group, metal, grip) {
  addPart(group, new THREE.ConeGeometry(0.075, 0.34, 3), metal, part("knife-blade", [0, 0.25, 0]));
  addPart(group, new THREE.BoxGeometry(0.18, 0.04, 0.05), grip, part("knife-guard", [0, 0.06, 0]));
  addPart(group, new THREE.CylinderGeometry(0.035, 0.04, 0.2, 8), grip, part("knife-grip", [0, -0.06, 0]));
}

function buildHammer(group, metal, grip) {
  addPart(group, new THREE.CylinderGeometry(0.04, 0.05, 0.62, 9), grip, part("hammer-handle", [0, 0.22, 0]));
  addPart(group, new THREE.BoxGeometry(0.3, 0.17, 0.2), grip, part("hammer-head", [0, 0.57, 0]));
  addPart(group, new THREE.CylinderGeometry(0.08, 0.1, 0.16, 8), metal, part("hammer-left-cap", [-0.21, 0.57, 0], [0, 0, Math.PI / 2]));
  addPart(group, new THREE.CylinderGeometry(0.08, 0.1, 0.16, 8), metal, part("hammer-right-cap", [0.21, 0.57, 0], [0, 0, Math.PI / 2]));
}

function buildStaff(group, metal, grip) {
  addPart(group, new THREE.CylinderGeometry(0.035, 0.045, 1.18, 10), grip, part("staff-shaft", [0, 0.42, 0]));
  addPart(group, new THREE.TorusGeometry(0.16, 0.035, 7, 18), metal, part("staff-crown", [0, 1.02, 0]));
  addPart(group, new THREE.OctahedronGeometry(0.11, 0), metal, part("staff-core", [0, 1.02, 0]));
}

function buildGauntlet(group, metal, grip) {
  addPart(group, new THREE.BoxGeometry(0.16, 0.25, 0.18), grip, part("gauntlet-brace", [0, 0.04, 0]));
  addPart(group, new THREE.OctahedronGeometry(0.15, 0), metal, part("gauntlet-core", [0, 0.22, -0.04]));
  addPart(group, new THREE.TorusGeometry(0.18, 0.025, 6, 16), metal, part("gauntlet-ring", [0, 0.22, -0.04], [Math.PI / 2, 0, 0]));
}

function addFaceFeature(group, shape, material, details) {
  const feature = addPart(group, shape, material, details);
  feature.userData.skipOutline = true;
}

function addPart(group, shape, material, details) {
  const mesh = new THREE.Mesh(shape, material);
  mesh.name = details.name;
  mesh.position.set(...details.position);
  if (details.rotation) mesh.rotation.set(...details.rotation);
  if (details.scale) mesh.scale.set(...details.scale);
  group.add(mesh);
  return mesh;
}

function part(name, position, rotation = null, scale = null) {
  return { name, position, rotation, scale };
}

function alignBodyToGround(body) {
  const bounds = new THREE.Box3().setFromObject(body);
  body.position.y = -bounds.min.y;
  return body.position.y;
}

function getHeight(group) {
  return new THREE.Box3().setFromObject(group).max.y;
}

function getMaterial(materials, key, fallback) {
  return materials[key] ?? materials[fallback] ?? Object.values(materials)[0];
}

function getBuild(kind) {
  if (kind === "brute") return { width: 1.1, shoulders: 1.22, headWidth: 1.05 };
  if (kind === "sprinter") return { width: 0.93, shoulders: 0.92, headWidth: 0.96 };
  if (kind === "ally") return { width: 0.96, shoulders: 1, headWidth: 0.98 };
  return { width: 1, shoulders: 1, headWidth: 1 };
}

const MELEE_BUILDERS = Object.freeze({ sword: buildSword, knife: buildKnife, hammer: buildHammer, staff: buildStaff, gauntlet: buildGauntlet });
const DOWN = new THREE.Vector3(0, -1, 0);

const ARM_PROFILE = Object.freeze({
  kind: "arm", rootX: 0.29, rootY: 1.27, rotationX: 0.18, rotationZ: 0.18,
  upperGeometry: geometry.armUpper, lowerGeometry: geometry.armLower,
  upperLength: 0.31, lowerLength: 0.29, jointName: "elbow",
  endGeometry: geometry.hand, endName: "hand", endMaterial: "skin", endDrop: 0.015, endZ: 0, socketed: true,
});

const LEG_PROFILE = Object.freeze({
  kind: "leg", rootX: 0.14, rootY: 0.75, rotationX: 0, rotationZ: 0.035,
  upperGeometry: geometry.legUpper, lowerGeometry: geometry.legLower,
  upperLength: 0.36, lowerLength: 0.34, jointName: "knee",
  endGeometry: geometry.foot, endName: "boot", endMaterial: "gear", endDrop: 0.045, endZ: -0.08, socketed: false,
});
