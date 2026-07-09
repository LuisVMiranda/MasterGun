import * as THREE from "three";
import { COLORS, ENTITY } from "../../game/content/constants.js";
import { createLabelSprite } from "./labels.js";
import { createWeaponObject } from "./weapons.js";

const shared = {
  bulletGeometry: new THREE.SphereGeometry(0.12, 12, 8),
  bulletMaterial: new THREE.MeshStandardMaterial({ color: "#1558ff", emissive: "#164aff", emissiveIntensity: 0.8 }),
  enemyBulletMaterial: new THREE.MeshStandardMaterial({ color: "#ff3451", emissive: "#ff133d", emissiveIntensity: 1 }),
  cashMaterial: new THREE.MeshStandardMaterial({ color: COLORS.cash, roughness: 0.35 }),
  stickHeadGeometry: new THREE.SphereGeometry(0.22, 18, 14),
  stickJointGeometry: new THREE.SphereGeometry(0.075, 10, 8),
  stickHandGeometry: new THREE.SphereGeometry(0.065, 10, 8),
  stickFootGeometry: new THREE.BoxGeometry(0.18, 0.09, 0.3),
  stickLimbGeometry: new THREE.CylinderGeometry(0.04, 0.055, 0.48, 10),
  stickTorsoGeometry: new THREE.CylinderGeometry(0.16, 0.22, 0.72, 14),
  stickMaterials: {
    runner: new THREE.MeshStandardMaterial({ color: "#ff3451", roughness: 0.5 }),
    sprinter: new THREE.MeshStandardMaterial({ color: "#ff5a49", roughness: 0.45 }),
    shield: new THREE.MeshStandardMaterial({ color: "#c92343", roughness: 0.6 }),
    brute: new THREE.MeshStandardMaterial({ color: "#a71935", roughness: 0.62 }),
    skin: new THREE.MeshStandardMaterial({ color: "#ff8f7f", roughness: 0.55 }),
    gear: new THREE.MeshStandardMaterial({ color: "#1b2230", metalness: 0.45, roughness: 0.25 }),
  },
};

export function createPlayerObject() {
  const group = new THREE.Group();
  const socket = new THREE.Group();
  const glow = new THREE.PointLight("#ffe58b", 0.8, 4);

  socket.position.set(0, 0, 0);
  glow.position.set(0, 0.65, 1.3);
  group.userData.weaponSocket = socket;
  group.add(socket, glow);
  setPlayerWeaponObject(group, "pistol", false);
  return group;
}

export function setPlayerWeaponObject(player, weaponId, doubleWeapon = false) {
  const visualKey = `${weaponId}:${doubleWeapon}`;
  if (player.userData.weaponId === visualKey) return;

  const socket = player.userData.weaponSocket;
  socket.clear();
  socket.add(...createPlayerWeapons(weaponId, doubleWeapon));
  player.userData.weaponId = visualKey;
}

function createPlayerWeapons(weaponId, doubleWeapon) {
  if (!doubleWeapon) return [createWeaponObject(weaponId)];

  const left = createWeaponObject(weaponId, { scale: 0.94 });
  const right = createWeaponObject(weaponId, { scale: 0.94 });
  left.position.x = -0.34;
  right.position.x = 0.34;
  right.scale.x *= -1;
  return [left, right];
}

export function createAssistantObject() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 10),
    new THREE.MeshStandardMaterial({ color: "#ffcf3a", metalness: 0.2, roughness: 0.35 }),
  );
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 0.55, 10),
    new THREE.MeshStandardMaterial({ color: "#223044", metalness: 0.5, roughness: 0.24 }),
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.34;
  group.add(body, barrel);
  return group;
}

export function createBulletObject(projectile = {}) {
  const material = projectile.owner === "enemy" ? shared.enemyBulletMaterial : shared.bulletMaterial;
  const mesh = new THREE.Mesh(shared.bulletGeometry, material);
  mesh.castShadow = true;
  return mesh;
}

export function createDamageNumberObject(damage) {
  const penalty = damage.tone === "penalty";
  return createLabelSprite(damage.text ?? `-${damage.value}`, {
    background: "rgba(8, 14, 22, 0.9)",
    foreground: penalty ? COLORS.debuff : "#ffcb3d",
    width: 512,
    height: 192,
    scaleX: penalty ? 1.36 : 1.05,
    scaleY: 0.58,
    fontSize: penalty ? 78 : 96,
    renderOrder: 30,
  });
}

export function createEntityObject(entity) {
  const creators = {
    [ENTITY.GATE]: createGateObject,
    [ENTITY.ENEMY]: createEnemyObject,
    [ENTITY.BARRICADE]: createBarricadeObject,
    [ENTITY.HAZARD]: createHazardObject,
    [ENTITY.SOLID_WALL]: createSolidWallObject,
    [ENTITY.SHOOTER]: createShooterObject,
    [ENTITY.FINISH_BLOCK]: createFinishBlockObject,
    [ENTITY.PICKUP]: createPickupObject,
    [ENTITY.WEAPON_PICKUP]: createWeaponPickupObject,
    [ENTITY.BOSS]: createBossObject,
    [ENTITY.CASH]: createCashDropObject,
  };

  return creators[entity.type]?.(entity) ?? new THREE.Group();
}

export function updateHealthObject(object, entity) {
  const bar = object.userData.healthBar;
  if (!bar || !entity.maxHealth) return;

  const ratio = Math.max(0.04, entity.health / entity.maxHealth);
  bar.scale.x = ratio;
  bar.position.x = -0.72 * (1 - ratio);
}

export function updateDamageNumberObject(object, damage) {
  object.position.set(damage.x, damage.y, damage.z);

  if (object.material) {
    object.material.opacity = Math.max(0, damage.ttl / damage.maxTtl);
  }
}

export function disposeEntityObject(object) {
  object.traverse((child) => {
    child.userData.dispose?.();
  });
}

function createGateObject(entity) {
  const group = new THREE.Group();
  const color = entity.gateType === "buff" ? COLORS.buff : COLORS.debuff;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 1.8, 0.24),
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.78, roughness: 0.25 }),
  );
  const planks = createGatePlanks(entity.gateType);
  const label = createLabelSprite(entity.label, { background: color, scaleX: 2.85, scaleY: 0.96 });
  const health = createHealthBar(color);

  frame.position.y = 0.9;
  label.position.set(0, 2.22, 0);
  health.position.set(0, 1.78, -0.15);
  group.add(frame, planks, label, health);
  attachHealthBar(group, health);
  return group;
}

function createGatePlanks(gateType) {
  const group = new THREE.Group();
  const color = gateType === "buff" ? "#355f40" : "#60252d";
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

  for (let index = 0; index < 4; index += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.18), material);
    plank.position.set(0, 0.42 + index * 0.3, -0.2);
    plank.rotation.z = index % 2 ? -0.18 : 0.18;
    group.add(plank);
  }

  return group;
}

function createEnemyObject(entity) {
  const group = createStickman(entity.enemyKind ?? "runner", getEnemyScale(entity));
  const label = createLabelSprite(entity.label, { background: "#ffffff", foreground: "#273248", scaleX: 1.18, scaleY: 0.5, fontSize: 86 });
  const health = createHealthBar(COLORS.buff);
  addEnemyVariantGear(group, entity.enemyKind);
  label.position.set(0, 1.86 * getEnemyScale(entity), 0);
  health.position.set(0, 1.45 * getEnemyScale(entity), 0);
  group.add(health, label);
  attachHealthBar(group, health);
  return group;
}

function createBarricadeObject(entity) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1, 0.64),
    new THREE.MeshStandardMaterial({ color: "#383f48", roughness: 0.8 }),
  );
  const chevron = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.16, 0.7),
    new THREE.MeshStandardMaterial({ color: COLORS.debuff, emissive: "#590018", emissiveIntensity: 0.35 }),
  );
  const health = createHealthBar(COLORS.warning);
  const label = createLabelSprite(entity.label, { background: COLORS.warning, foreground: "#182033", scaleX: 1.25, scaleY: 0.5 });
  base.position.y = 0.48;
  chevron.position.set(0, 0.75, -0.03);
  chevron.rotation.z = -0.42;
  health.position.set(0, 1.25, 0);
  label.position.set(0, 1.55, 0);
  group.add(base, chevron, health, label);
  attachHealthBar(group, health);
  return group;
}

function createSolidWallObject(entity) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 1.45, 0.82),
    new THREE.MeshStandardMaterial({ color: "#566477", roughness: 0.82, metalness: 0.04 }),
  );
  const label = createLabelSprite(entity.label, { background: "#566477", scaleX: 1.65, scaleY: 0.58 });
  const health = createHealthBar(COLORS.warning);
  wall.position.y = 0.72;
  label.position.set(0, 1.78, 0);
  health.position.set(0, 1.5, 0);
  group.add(wall, health, label);
  attachHealthBar(group, health);
  return group;
}

function createShooterObject(entity) {
  const group = createStickman(entity.shooterKind === "walker" ? "sprinter" : "runner", 1.12);
  const color = entity.shooterKind === "walker" ? "#ff5a49" : COLORS.debuff;
  const label = createLabelSprite(entity.label, { background: color, scaleX: 1.45, scaleY: 0.56, fontSize: 66 });
  const health = createHealthBar(COLORS.buff);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.76, 12),
    shared.stickMaterials.gear,
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.94, -0.46);
  label.position.set(0, 2.02, 0);
  health.position.set(0, 1.58, 0);
  group.add(barrel, health, label);
  attachHealthBar(group, health);
  return group;
}

function createHazardObject(entity) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: COLORS.debuff, roughness: 0.5 });
  const label = createLabelSprite(entity.label, { background: COLORS.debuff, scaleX: 1.45, scaleY: 0.52, fontSize: 68 });

  for (let index = 0; index < 3; index += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 4), material);
    spike.position.set((index - 1) * 0.32, 0.38, 0);
    group.add(spike);
  }

  label.position.set(0, 1.12, 0);
  group.add(label);
  return group;
}

function createPickupObject(entity) {
  const group = new THREE.Group();
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({ color: COLORS.buff, emissive: "#0a8f32", emissiveIntensity: 0.35, roughness: 0.28 }),
  );
  const label = createLabelSprite(entity.label, { background: COLORS.buff, foreground: "#082015", scaleX: 1.35, scaleY: 0.5, fontSize: 66 });
  gem.position.y = 0.52;
  label.position.set(0, 1.18, 0);
  group.add(gem, label);
  return group;
}

function createWeaponPickupObject(entity) {
  const group = new THREE.Group();
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.52, 0.7),
    new THREE.MeshStandardMaterial({ color: "#875cff", roughness: 0.38, metalness: 0.18 }),
  );
  const weapon = createWeaponObject(entity.weaponId, { scale: 0.58 });
  const label = createLabelSprite(entity.label, { background: "#875cff", scaleX: 1.55, scaleY: 0.54, fontSize: 62 });
  weapon.position.set(0, 0.54, 0.02);
  crate.position.y = 0.32;
  label.position.set(0, 1.12, 0);
  group.add(crate, weapon, label);
  return group;
}

function createCashDropObject(entity) {
  const group = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 18), shared.cashMaterial);
  const label = createLabelSprite(entity.label, { background: COLORS.cash, foreground: "#102014", scaleX: 1.05, scaleY: 0.46, fontSize: 72 });

  coin.rotation.x = Math.PI / 2;
  coin.position.y = 0.28;
  label.position.set(0, 0.82, 0);
  group.add(coin, label);
  return group;
}

function createFinishBlockObject(entity) {
  const group = new THREE.Group();
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 1.15, 0.8),
    new THREE.MeshStandardMaterial({ color: "#273040", roughness: 0.66 }),
  );
  const cash = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.46), shared.cashMaterial);
  const label = createLabelSprite(entity.label, { background: "#202938", scaleX: 1.18, scaleY: 0.5, fontSize: 78 });
  const health = createHealthBar(COLORS.cash);
  block.position.y = 0.57;
  cash.position.y = 1.22;
  health.position.set(0, 1.48, 0);
  label.position.set(0, 1.88, 0);
  group.add(block, cash, health, label);
  attachHealthBar(group, health);
  return group;
}

function createBossObject(entity) {
  const group = createStickman("brute", 1.8);
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 0.7, 5),
    new THREE.MeshStandardMaterial({ color: COLORS.warning, emissive: "#6f4100", emissiveIntensity: 0.28 }),
  );
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.18, 1, 14),
    new THREE.MeshStandardMaterial({ color: "#1b2230", metalness: 0.55, roughness: 0.22 }),
  );
  const label = createLabelSprite(entity.label, { background: COLORS.debuff, scaleX: 1.62, scaleY: 0.62, fontSize: 74 });
  const health = createHealthBar(COLORS.debuff);
  crown.position.y = 2.68;
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 1.42, -0.72);
  health.position.set(0, 3.02, 0);
  label.position.set(0, 3.48, 0);
  group.add(crown, barrel, health, label);
  attachHealthBar(group, health);
  return group;
}

function createStickman(kind, scale = 1) {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const material = shared.stickMaterials[kind] ?? shared.stickMaterials.runner;
  const torso = createTorso(material);
  const head = createHead(material);
  const limbs = createStickmanLimbs(material, scale);

  bodyGroup.scale.setScalar(scale);
  bodyGroup.add(torso, head, ...limbs);
  bodyGroup.traverse((child) => {
    child.castShadow = true;
  });
  group.add(bodyGroup);
  group.userData.stickman = { limbs };
  return group;
}

function createStickmanLimbs(material, scale) {
  return [
    createLimb(material, { x: -0.28, y: 1.08, rotationZ: 0.54, rotationX: 0.38, endKind: "hand" }),
    createLimb(material, { x: 0.28, y: 1.08, rotationZ: -0.54, rotationX: -0.38, endKind: "hand" }),
    createLimb(material, { x: -0.15, y: 0.45, rotationZ: -0.28, rotationX: -0.18, endKind: "foot" }),
    createLimb(material, { x: 0.15, y: 0.45, rotationZ: 0.28, rotationX: 0.18, endKind: "foot" }),
  ].map((limb) => {
    limb.scale.y = scale > 1.4 ? 1.08 : 1;
    return limb;
  });
}

function createTorso(material) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(shared.stickTorsoGeometry, material);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.1), shared.stickMaterials.gear);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), material);
  torso.position.y = 0.95;
  vest.position.set(0, 1.02, -0.08);
  pelvis.position.y = 0.56;
  group.add(torso, vest, pelvis);
  return group;
}

function createHead(material) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(shared.stickHeadGeometry, shared.stickMaterials.skin);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.235, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), material);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.06, 0.045), shared.stickMaterials.gear);
  head.position.y = 1.52;
  helmet.position.y = 1.61;
  visor.position.set(0, 1.54, -0.19);
  group.add(head, helmet, visor);
  return group;
}

function createLimb(material, config) {
  const { x, y, rotationZ, rotationX, endKind } = config;
  const group = new THREE.Group();
  const upper = new THREE.Mesh(shared.stickLimbGeometry, material);
  const lower = new THREE.Mesh(shared.stickLimbGeometry, material);
  const joint = new THREE.Mesh(shared.stickJointGeometry, shared.stickMaterials.gear);
  const end = createLimbEnd(endKind);
  upper.position.y = -0.2;
  lower.position.y = -0.62;
  joint.position.y = -0.42;
  end.position.y = -0.86;
  group.position.set(x, y, 0);
  group.rotation.set(rotationX, 0, rotationZ);
  group.userData.baseRotation = { x: rotationX, z: rotationZ };
  group.add(upper, lower, joint, end);
  return group;
}

function createLimbEnd(endKind) {
  if (endKind === "foot") return new THREE.Mesh(shared.stickFootGeometry, shared.stickMaterials.gear);
  return new THREE.Mesh(shared.stickHandGeometry, shared.stickMaterials.skin);
}

function addEnemyVariantGear(group, enemyKind) {
  if (enemyKind !== "shield") return;

  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.08), shared.stickMaterials.gear);
  shield.position.set(0.35, 0.95, -0.12);
  shield.rotation.z = -0.18;
  group.add(shield);
}

function getEnemyScale(entity) {
  if (entity.enemyKind === "brute") return 1.34;
  if (entity.enemyKind === "sprinter") return 0.92;
  return 1;
}

function createHealthBar(color) {
  const group = new THREE.Group();
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(1.58, 0.18, 0.1),
    new THREE.MeshBasicMaterial({ color: "#111827", depthTest: false }),
  );
  const fill = new THREE.Mesh(
    new THREE.BoxGeometry(1.44, 0.2, 0.12),
    new THREE.MeshBasicMaterial({ color, depthTest: false }),
  );
  back.renderOrder = 20;
  fill.renderOrder = 21;
  group.userData.fill = fill;
  group.add(back, fill);
  return group;
}

function attachHealthBar(group, health) {
  group.userData.healthBar = health.userData.fill;
}
