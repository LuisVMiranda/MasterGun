import * as THREE from "three";
import { ENTITY, TARGET_SCALE } from "../../game/content/constants.js";
import { findWeapon } from "../../game/content/weapons.js";
import { createThreeApp } from "../app/createThreeApp.js";
import { animateActorObject, createBulletObject, createDamageNumberObject, createSoldierObject } from "../objects/actors.js";
import { createEntityObject, createPlayerObject } from "../objects/actors.js";
import { disposeEntityObject, updateDamageNumberObject, updateHealthObject } from "../objects/actors.js";
import { setPlayerWeaponObject } from "../objects/actors.js";
import { animatePickupIcon } from "../objects/pickupIcon.js";
import { animateFloorPickup } from "../objects/approvedStructures.js";
import { createProjectilePool } from "../objects/projectilePool.js";
import { createProjectileVfxManager } from "../objects/approvedProjectiles.js";
import { createSpecialAimGuide, updateSpecialAimGuide } from "../objects/specialAim.js";
import { getReloadPose } from "../objects/weaponAnimation.js";
import { animateWeaponObject } from "../objects/weapons.js";
import { createWorld } from "../objects/world.js";
import { updateBossVisual } from "../objects/bossVisuals.js";
import { HUMANOID_MOTION, resolveHumanoidMotion } from "../objects/humanoidMotion.js";
import { createOperatorLodBatch } from "../objects/operatorLod.js";

export function createRenderBridge(host) {
  const app = createThreeApp(host);
  const world = createWorld(app.scene);
  const player = createPlayerObject();
  const soldiers = new THREE.Group();
  const entityMeshes = new Map();
  const specialBulletMeshes = new Map();
  const projectilePool = createProjectilePool(app.scene);
  const projectileEffects = createProjectileVfxManager(app.scene);
  const projectileSnapshots = new Map();
  const damageMeshes = new Map();
  const specialAim = createSpecialAimGuide(app.scene);
  const operatorLod = createOperatorLodBatch();

  app.scene.add(player, soldiers, operatorLod.group);

  return {
    canvas: app.canvas,
    update(state, dt = 0) {
      const run = state.run;
      world.update(run);
      updatePlayer(player, soldiers, state);
      syncEntities(app.scene, entityMeshes, operatorLod, run);
      syncBullets(app.scene, projectilePool, specialBulletMeshes, getProjectiles(run), run?.elapsed ?? 0);
      syncProjectileEffects(projectileEffects, projectileSnapshots, getProjectiles(run), dt);
      syncDamageNumbers(app.scene, damageMeshes, run?.damageNumbers ?? []);
      updateSpecialAimGuide(specialAim, run);
      updateCamera(app.camera, run);
      app.renderer.render(app.scene, app.camera);
    },
  };
}

function updatePlayer(player, soldiers, state) {
  const run = state.run;
  const x = run?.player.x ?? 0;
  const recoilZ = run?.player.recoilZ ?? 0;
  const weaponId = run?.weaponId ?? state.save.equippedWeapon;
  setPlayerWeaponObject(player, weaponId, hasDoubleWeapon(run, weaponId));
  updateWeaponAnimation(player, run);
  player.position.set(x, 0.08, -recoilZ);
  player.rotation.z = -x * 0.04;
  syncSoldiers(soldiers, run);
}

function updateWeaponAnimation(player, run) {
  const pose = getReloadPose(run?.effects?.forceReload);
  const socket = player.userData.weaponSocket;
  socket.rotation.z = pose.rotationZ;
  socket.position.y = pose.y;
  const firing = hasRecentPlayerShot(run);
  socket.children.forEach((weapon) => animateWeaponObject(weapon, run?.elapsed ?? 0, firing));
}

function hasRecentPlayerShot(run) {
  return (run?.bullets ?? []).some((bullet) => run.elapsed - bullet.bornAt < 0.09);
}

function hasDoubleWeapon(run, weaponId) {
  if (!run) return false;
  return run.stats.projectileCount > findWeapon(weaponId).projectiles;
}

function syncSoldiers(group, run) {
  const active = (run?.soldiers ?? []).filter((soldier) => soldier.active && soldier.health > 0);
  const reloadPose = getReloadPose(run?.effects?.forceSoldierReload);

  while (group.children.length < active.length) {
    group.add(createSoldierObject());
  }

  while (group.children.length > active.length) {
    group.remove(group.children.at(-1));
  }

  group.children.forEach((mesh, index) => {
    const soldier = active[index];
    const motion = trackLateralMotion(mesh, soldier, HUMANOID_MOTION.FORWARD);
    mesh.position.set(soldier.x, 0, soldier.z);
    mesh.rotation.z = reloadPose.rotationZ * 0.45;
    mesh.scale.setScalar(0.9);
    animateActorObject(mesh, motion, run?.elapsed ?? 0);
    updateHealthObject(mesh, soldier);
  });
}

function syncEntities(scene, meshes, operatorLod, run) {
  const entities = run?.entities ?? [];
  const farOperators = entities.filter(isFarOperator);
  const detailed = entities.filter((entity) => !isFarOperator(entity));
  const activeIds = new Set(detailed.map((entity) => entity.id));
  removeMissing(scene, meshes, activeIds);
  operatorLod.update(farOperators.map(toLodItem));

  detailed.forEach((entity) => {
    const mesh = getEntityMesh(scene, meshes, entity);
    const motion = getEntityMotion(mesh, entity);
    mesh.position.set(entity.x, 0, entity.z);
    mesh.scale.setScalar(mesh.userData.baseScale ?? TARGET_SCALE);
    updateHealthObject(mesh, entity);
    animateEntity(mesh, entity, run?.elapsed ?? 0, motion);
  });
}

function getEntityMesh(scene, meshes, entity) {
  if (meshes.has(entity.id)) return meshes.get(entity.id);

  const mesh = createEntityObject(entity);
  mesh.userData.baseScale = TARGET_SCALE;
  meshes.set(entity.id, mesh);
  scene.add(mesh);
  return mesh;
}

function removeMissing(scene, meshes, activeIds) {
  for (const [id, mesh] of meshes.entries()) {
    if (activeIds.has(id)) continue;
    scene.remove(mesh);
    disposeEntityObject(mesh);
    meshes.delete(id);
  }
}

function getProjectiles(run) {
  if (!run) return [];
  return [...run.bullets, ...run.enemyProjectiles];
}

function syncBullets(scene, pool, specialMeshes, bullets, elapsed) {
  pool.sync(bullets.filter((bullet) => !bullet.special));
  const specialBullets = bullets.filter((bullet) => bullet.special);
  const activeIds = new Set(specialBullets.map((bullet) => bullet.id));
  removeBulletMeshes(scene, specialMeshes, activeIds);

  specialBullets.forEach((bullet) => {
    const mesh = getBulletMesh(scene, specialMeshes, bullet.id, bullet);
    mesh.position.set(bullet.x, 0.58, bullet.z);
    mesh.scale.setScalar(2.35);
    animateProjectile(mesh, bullet, elapsed);
  });
}

function animateProjectile(mesh, bullet, elapsed) {
  if (!bullet.special) return;
  const pulse = 1 + Math.sin(elapsed * 13) * 0.12;
  mesh.scale.multiplyScalar(pulse);
  mesh.rotation.z += 0.12;
  mesh.rotation.y += 0.08;
}

function getBulletMesh(scene, meshes, id, bullet) {
  if (meshes.has(id)) return meshes.get(id);

  const mesh = createBulletObject(bullet);
  meshes.set(id, mesh);
  scene.add(mesh);
  return mesh;
}

function removeBulletMeshes(scene, meshes, activeIds) {
  for (const [id, mesh] of meshes.entries()) {
    if (activeIds.has(id)) continue;
    scene.remove(mesh);
    meshes.delete(id);
  }
}

function syncProjectileEffects(manager, snapshots, projectiles, dt) {
  const activeIds = new Set(projectiles.map((projectile) => projectile.id));
  projectiles.forEach((projectile) => trackProjectileBirth(manager, snapshots, projectile));
  snapshots.forEach((snapshot, id) => {
    if (activeIds.has(id)) return;
    manager.spawnImpact(snapshot.projectile, snapshot.position);
    snapshots.delete(id);
  });
  manager.update(dt);
}

function trackProjectileBirth(manager, snapshots, projectile) {
  const position = new THREE.Vector3(projectile.x, 0.58, projectile.z);
  if (!snapshots.has(projectile.id)) manager.spawnMuzzle(projectile, position);
  snapshots.set(projectile.id, { position, projectile });
}

function syncDamageNumbers(scene, meshes, damageNumbers) {
  const activeIds = new Set(damageNumbers.map((damage) => damage.id));
  removeMissing(scene, meshes, activeIds);

  damageNumbers.forEach((damage) => {
    const mesh = getDamageMesh(scene, meshes, damage);
    updateDamageNumberObject(mesh, damage);
  });
}

function getDamageMesh(scene, meshes, damage) {
  if (meshes.has(damage.id)) return meshes.get(damage.id);

  const mesh = createDamageNumberObject(damage);
  meshes.set(damage.id, mesh);
  scene.add(mesh);
  return mesh;
}

function animateEntity(mesh, entity, elapsed, motion) {
  animateActorObject(mesh, motion, elapsed);

  animatePickupIcon(mesh, entity, elapsed);
  animateFloorPickup(mesh.userData.approvedPickup ?? mesh, elapsed);
  updateBossVisual(mesh, entity, elapsed);

  if (entity.broken) {
    mesh.scale.y = (mesh.userData.baseScale ?? TARGET_SCALE) * 0.82;
  }
}

function isFarOperator(entity) {
  return entity.type === ENTITY.SHOOTER && entity.z > FAR_OPERATOR_Z;
}

function toLodItem(entity) {
  return { faction: "enemy", scale: TARGET_SCALE, x: entity.x, z: entity.z };
}

function getEntityMotion(mesh, entity) {
  return trackLateralMotion(mesh, entity, getEntityFallbackMotion(entity));
}

function getEntityFallbackMotion(entity) {
  if (entity.type === ENTITY.BOSS) return HUMANOID_MOTION.BACKWARD;
  if (entity.type === ENTITY.SHOOTER && entity.shooterKind !== "walker") return HUMANOID_MOTION.AIM;
  return HUMANOID_MOTION.FORWARD;
}

function trackLateralMotion(mesh, actor, fallback) {
  const current = { x: actor.x, z: actor.z };
  const previous = mesh.userData.motionPosition;
  const lateralPrevious = previous ? { x: previous.x, z: current.z } : null;
  const motion = resolveHumanoidMotion(lateralPrevious, current, fallback);
  mesh.userData.motionPosition = current;
  return motion;
}

function updateCamera(camera, run) {
  const x = run?.player.x ?? 0;
  camera.position.x += (x * 0.16 - camera.position.x) * 0.08;
  camera.lookAt(x * 0.08, 0.05, 19);
}

const FAR_OPERATOR_Z = 48;
