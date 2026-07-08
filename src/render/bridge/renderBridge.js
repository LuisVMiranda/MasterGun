import * as THREE from "three";
import { TARGET_SCALE } from "../../game/content/constants.js";
import { createThreeApp } from "../app/createThreeApp.js";
import { createAssistantObject, createBulletObject, createDamageNumberObject } from "../objects/actors.js";
import { createEntityObject, createPlayerObject } from "../objects/actors.js";
import { disposeEntityObject, updateDamageNumberObject, updateHealthObject } from "../objects/actors.js";
import { createWorld } from "../objects/world.js";

export function createRenderBridge(host) {
  const app = createThreeApp(host);
  const world = createWorld(app.scene);
  const player = createPlayerObject();
  const assistants = new THREE.Group();
  const entityMeshes = new Map();
  const bulletMeshes = new Map();
  const damageMeshes = new Map();

  app.scene.add(player, assistants);

  return {
    canvas: app.canvas,
    update(state) {
      const run = state.run;
      world.update(run);
      updatePlayer(player, assistants, run);
      syncEntities(app.scene, entityMeshes, run?.entities ?? []);
      syncBullets(app.scene, bulletMeshes, getProjectiles(run));
      syncDamageNumbers(app.scene, damageMeshes, run?.damageNumbers ?? []);
      updateCamera(app.camera, run);
      app.renderer.render(app.scene, app.camera);
    },
  };
}

function updatePlayer(player, assistants, run) {
  const x = run?.player.x ?? 0;
  const recoilZ = run?.player.recoilZ ?? 0;
  player.position.set(x, 0.08, -recoilZ);
  player.rotation.z = -x * 0.04;
  syncAssistants(assistants, run);
}

function syncAssistants(group, run) {
  const count = run ? Math.min(4, run.stats.assistants) : 0;

  while (group.children.length < count) {
    group.add(createAssistantObject());
  }

  while (group.children.length > count) {
    group.remove(group.children.at(-1));
  }

  group.children.forEach((assistant, index) => {
    const side = index % 2 ? 1 : -1;
    assistant.position.set((run?.player.x ?? 0) + side * (0.85 + index * 0.2), 0.9, -0.3 - index * 0.18);
    assistant.rotation.set(0, 0, 0);
  });
}

function syncEntities(scene, meshes, entities) {
  const activeIds = new Set(entities.map((entity) => entity.id));
  removeMissing(scene, meshes, activeIds);

  entities.forEach((entity) => {
    const mesh = getEntityMesh(scene, meshes, entity);
    mesh.position.set(entity.x, 0, entity.z);
    mesh.scale.setScalar(mesh.userData.baseScale ?? TARGET_SCALE);
    updateHealthObject(mesh, entity);
    animateEntity(mesh, entity);
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

function syncBullets(scene, meshes, bullets) {
  const activeIds = new Set(bullets.map((bullet) => bullet.id));
  removeBulletMeshes(scene, meshes, activeIds);

  bullets.forEach((bullet) => {
    const mesh = getBulletMesh(scene, meshes, bullet.id, bullet);
    mesh.position.set(bullet.x, 0.58, bullet.z);
    mesh.scale.setScalar(getProjectileScale(bullet));
  });
}

function getProjectileScale(bullet) {
  if (bullet.owner === "assistant") return 0.78;
  if (bullet.owner === "enemy") return 1.28;
  return 1;
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

function animateEntity(mesh, entity) {
  if (mesh.userData.stickman) {
    animateStickman(mesh, entity);
  }

  if (entity.broken) {
    mesh.scale.y = (mesh.userData.baseScale ?? TARGET_SCALE) * 0.82;
  }
}

function animateStickman(mesh, entity) {
  const swing = Math.sin(entity.z * 0.7 + entity.id) * 0.25;
  const limbs = mesh.userData.stickman.limbs;
  limbs.forEach((limb, index) => {
    const direction = index % 2 ? -1 : 1;
    limb.rotation.x = limb.userData.baseRotation.x + swing * direction;
    limb.rotation.z = limb.userData.baseRotation.z + swing * direction * 0.35;
  });
}

function updateCamera(camera, run) {
  const x = run?.player.x ?? 0;
  camera.position.x += (x * 0.16 - camera.position.x) * 0.08;
  camera.lookAt(x * 0.08, 0.05, 19);
}
