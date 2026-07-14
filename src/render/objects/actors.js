import * as THREE from "three";
import { COLORS, ENTITY } from "../../game/content/constants.js";
import { createLabelSprite } from "./labels.js";
import { addMeshOutline } from "./outline.js";
import { createPickupIconSprite } from "./pickupIcon.js";
import { createWeaponObject } from "./weapons.js";
import { createProjectileVisual } from "./approvedProjectiles.js";
import { createBrickWall, createFloorPickup, createPostedGate, updateBrickWall } from "./approvedStructures.js";
import { animateApprovedOperator, createApprovedOperator } from "./approvedOperator.js";
import { createHumanoid, createInfantryRifle, createMeleeWeapon, equipHumanoid } from "./humanoid.js";
import { HUMANOID_MOTION, animateHumanoid } from "./humanoidMotion.js";
import { SOLDIER_SHADOW, addContactShadow, applyEntityShadow, enableShadowCasting } from "./shadows.js";
import { setWeaponContactShadow } from "./weaponShadows.js";
import { decorateBoss } from "./bossVisuals.js";
import { attachDamageVisual, updateDamageVisual } from "./damageStates.js";

const shared = {
  specialBulletMaterial: new THREE.MeshStandardMaterial({ color: "#fff45c", emissive: "#ff32cf", emissiveIntensity: 1.8, metalness: 0.15, roughness: 0.2 }),
  cashMaterial: new THREE.MeshStandardMaterial({ color: COLORS.cash, roughness: 0.35 }),
  stickMaterials: {
    ally: new THREE.MeshStandardMaterial({ color: "#249bff", roughness: 0.48 }),
    runner: new THREE.MeshStandardMaterial({ color: "#ff3451", roughness: 0.5 }),
    sprinter: new THREE.MeshStandardMaterial({ color: "#ff5a49", roughness: 0.45 }),
    shield: new THREE.MeshStandardMaterial({ color: "#c92343", roughness: 0.6 }),
    brute: new THREE.MeshStandardMaterial({ color: "#a71935", roughness: 0.62 }),
    skin: new THREE.MeshStandardMaterial({ color: "#ff8f7f", roughness: 0.55 }),
    face: new THREE.MeshStandardMaterial({ color: "#17202b", roughness: 0.42 }),
    gear: new THREE.MeshStandardMaterial({ color: "#1b2230", metalness: 0.45, roughness: 0.25 }),
    weaponAccent: new THREE.MeshStandardMaterial({ color: "#748044", metalness: 0.24, roughness: 0.46 }),
    sword: new THREE.MeshStandardMaterial({ color: "#dce8f7", metalness: 0.58, roughness: 0.2 }),
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
  setWeaponContactShadow(player, weaponId, doubleWeapon);
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

export function createSoldierObject() {
  const group = createApprovedOperator({ faction: "soldier", scale: 0.9, weaponId: "machineGun" });
  group.rotation.y = Math.PI;
  addContactShadow(group, SOLDIER_SHADOW);
  enableShadowCasting(group);
  return addMeshOutline(group, 0.05);
}

export function animateActorObject(object, motion, time) {
  if (!object.userData.operator) {
    animateHumanoid(object, motion, time);
    return;
  }
  const animation = APPROVED_MOTION_MAP[motion] ?? "idle";
  const animationTime = motion === HUMANOID_MOTION.BACKWARD ? -time : time;
  animateApprovedOperator(object, animation, animationTime);
}

export function createBulletObject(projectile = {}) {
  if (projectile.special) return createSpecialBulletObject();
  return createProjectileVisual(projectile);
}

function createSpecialBulletObject() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), shared.specialBulletMaterial);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: "#53f6ff", transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  const firstRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 28), ringMaterial);
  const secondRing = firstRing.clone();
  firstRing.rotation.x = Math.PI / 2;
  secondRing.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  group.add(core, firstRing, secondRing);
  group.userData.specialProjectile = true;
  return group;
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
    [ENTITY.RECRUITER]: createRecruiterObject,
  };

  const object = creators[entity.type]?.(entity) ?? new THREE.Group();
  if (!object.userData.handlesDamageVisual) attachDamageVisual(object, entity);
  applyEntityShadow(object, entity);
  return shouldOutlineEntity(entity) ? addMeshOutline(object, getOutlineThickness(entity)) : object;
}

export function updateHealthObject(object, entity) {
  updateDamageVisual(object, entity);
  const bar = object.userData.healthBar;
  if (!bar || !entity.maxHealth) return;

  const ratio = Math.max(0.04, entity.health / entity.maxHealth);
  object.userData.updateVisual?.(ratio);
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
  const group = createPostedGate({ type: entity.gateType });
  const color = entity.gateType === "buff" ? COLORS.buff : COLORS.debuff;
  const label = createLabelSprite(entity.label, { background: color, scaleX: 2.85, scaleY: 0.96 });
  const health = createHealthBar(color);

  label.position.set(0, 2.38, 0);
  health.position.set(0, 2.08, -0.15);
  group.add(label, health);
  attachHealthBar(group, health);
  return group;
}

function createEnemyObject(entity) {
  const group = createStickman(entity.enemyKind ?? "runner", getEnemyScale(entity));
  const label = createLabelSprite(entity.label, { background: "#ffffff", foreground: "#273248", scaleX: 1.18, scaleY: 0.5, fontSize: 86 });
  const health = createHealthBar(COLORS.buff);
  addEnemyVariantGear(group, entity.enemyKind);
  addEnemyLoadout(group, entity.enemyKind);
  positionUnitMarkers(group, health, label);
  group.add(health, label);
  attachHealthBar(group, health);
  return group;
}

function createRecruiterObject(entity) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.75, 0.6),
    new THREE.MeshStandardMaterial({ color: "#1dc5a8", roughness: 0.42, metalness: 0.12 }),
  );
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.08),
    new THREE.MeshStandardMaterial({ color: COLORS.buff, emissive: "#0f7f39", emissiveIntensity: 0.28 }),
  );
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.35, 8), shared.stickMaterials.gear);
  const label = createLabelSprite(entity.label, { background: "#1dc5a8", foreground: "#071c18", scaleX: 1.55, scaleY: 0.54, fontSize: 68 });
  const health = createHealthBar(COLORS.buff);
  base.position.y = 0.38;
  pole.position.set(-0.45, 1.05, 0);
  flag.position.set(-0.05, 1.38, 0);
  health.position.set(0, 1.72, 0);
  label.position.set(0, 2.08, 0);
  group.add(base, pole, flag, health, label);
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
  const ratio = entity.maxHealth ? entity.health / entity.maxHealth : 1;
  const wall = createBrickWall(ratio);
  const label = createLabelSprite(entity.label, { background: "#566477", scaleX: 1.65, scaleY: 0.58 });
  const health = createHealthBar(COLORS.warning);
  label.position.set(0, 2.58, 0);
  health.position.set(0, 2.26, 0);
  group.add(wall, health, label);
  group.userData.handlesDamageVisual = true;
  group.userData.updateVisual = (healthRatio) => updateBrickWall(wall, healthRatio);
  attachHealthBar(group, health);
  return group;
}

function createShooterObject(entity) {
  const group = createApprovedOperator({ faction: "enemy", scale: 1.03, weaponId: "machineGun" });
  const color = entity.shooterKind === "walker" ? "#ff5a49" : COLORS.debuff;
  const label = createLabelSprite(entity.label, { background: color, scaleX: 1.45, scaleY: 0.56, fontSize: 66 });
  const health = createHealthBar(COLORS.buff);
  positionUnitMarkers(group, health, label);
  group.add(health, label);
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
  const pickup = createFloorPickup(getPickupVisualKind(entity));
  const label = createLabelSprite(entity.label, { background: COLORS.buff, foreground: "#082015", scaleX: 1.35, scaleY: 0.5, fontSize: 66 });
  label.position.set(0, 1.82, 0);
  group.add(pickup, label);
  group.userData.approvedPickup = pickup;
  return group;
}

function getPickupVisualKind(entity) {
  if (entity.stat === "ammo") return "ammo";
  if (entity.gateType === "debuff" || entity.value < 0) return "debuff";
  return "power";
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
  addPickupSignal(group, "weapon", 1.84);
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
  addPickupSignal(group, "cash", 1.4);
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
  const label = createLabelSprite(entity.label, { background: COLORS.debuff, scaleX: 1.62, scaleY: 0.62, fontSize: 74 });
  const health = createHealthBar(COLORS.debuff);
  addBossLoadout(group, entity.bossFamily);
  positionUnitMarkers(group, health, label, { health: 0.12, label: 0.62 });
  if (!entity.bossFamily) {
    crown.position.y = group.userData.humanoid.height - 0.02;
    group.add(crown);
  }
  group.add(health, label);
  decorateBoss(group, entity);
  attachHealthBar(group, health);
  return group;
}

function addEnemyLoadout(group, enemyKind) {
  if (enemyKind === "sprinter") {
    equipHumanoid(group, createMeleeWeapon("knife", shared.stickMaterials), { hand: "left", pose: "melee" });
    equipHumanoid(group, createMeleeWeapon("knife", shared.stickMaterials), { hand: "right", pose: "melee" });
    return;
  }
  const weapon = enemyKind === "brute" ? "hammer" : "sword";
  equipHumanoid(group, createMeleeWeapon(weapon, shared.stickMaterials), { hand: "right", pose: "melee" });
}

function addBossLoadout(group, family) {
  if (!family || family === "triCannon") {
    const rifle = createInfantryRifle(shared.stickMaterials.gear, shared.stickMaterials.weaponAccent);
    rifle.scale.setScalar(family ? 1.18 : 1.08);
    equipHumanoid(group, rifle, { pose: "rifle" });
    return;
  }
  if (family === "arcDuelist") {
    equipHumanoid(group, createMeleeWeapon("sword", shared.stickMaterials), { hand: "left", pose: "melee" });
    equipHumanoid(group, createMeleeWeapon("sword", shared.stickMaterials), { hand: "right", pose: "melee" });
    return;
  }
  const weapons = { ironWarden: "hammer", skyTempest: "staff", reclaimer: "gauntlet" };
  equipHumanoid(group, createMeleeWeapon(weapons[family] ?? "hammer", shared.stickMaterials), { hand: "right", pose: "melee" });
}

function createStickman(kind, scale = 1) {
  return createHumanoid(kind, scale, shared.stickMaterials);
}

function positionUnitMarkers(group, health, label, gaps = {}) {
  const height = group.userData.humanoid?.height ?? 1.75;
  health.position.set(0, height + (gaps.health ?? 0.08), 0);
  label.position.set(0, height + (gaps.label ?? 0.44), 0);
}

function addEnemyVariantGear(group, enemyKind) {
  if (enemyKind !== "shield") return;
  const shield = createEnemyShield();
  shield.position.set(-0.4, 1.02, -0.16);
  shield.rotation.z = 0.1;
  group.add(shield);
}

function createEnemyShield() {
  const shield = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 6), shared.stickMaterials.gear);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.115, 6), shared.stickMaterials.shield);
  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.38, 0.035), shared.stickMaterials.sword);
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.035), shared.stickMaterials.sword);
  rim.rotation.x = Math.PI / 2;
  plate.rotation.x = Math.PI / 2;
  plate.position.z = -0.018;
  vertical.position.z = -0.08;
  horizontal.position.z = -0.08;
  rim.name = "shield-rim";
  plate.name = "shield-plate";
  vertical.name = "shield-emblem-vertical";
  horizontal.name = "shield-emblem-horizontal";
  shield.name = "equipment-shield";
  shield.add(rim, plate, vertical, horizontal);
  return shield;
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

function addPickupSignal(group, kind, baseY) {
  const sprite = createPickupIconSprite(kind);
  sprite.position.set(0, baseY, 0);
  group.userData.pickupIcon = { sprite, baseY };
  group.add(sprite);
}

function getOutlineThickness(entity) {
  if (entity.type === ENTITY.BOSS) return 0.04;
  if (entity.type === ENTITY.ENEMY || entity.type === ENTITY.SHOOTER) return 0.055;
  if (entity.type === ENTITY.PICKUP || entity.type === ENTITY.CASH) return 0.065;
  return 0.05;
}

export function shouldOutlineEntity(entity) {
  return ![ENTITY.GATE, ENTITY.PICKUP, ENTITY.HAZARD].includes(entity.type);
}

const APPROVED_MOTION_MAP = Object.freeze({
  [HUMANOID_MOTION.IDLE]: "idle",
  [HUMANOID_MOTION.AIM]: "aim",
  [HUMANOID_MOTION.FORWARD]: "run",
  [HUMANOID_MOTION.BACKWARD]: "run",
  [HUMANOID_MOTION.LEFT]: "strafeLeft",
  [HUMANOID_MOTION.RIGHT]: "strafeRight",
});
