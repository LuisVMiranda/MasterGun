import * as THREE from "three";
import { PROJECTILE_PROFILE_IDS, getProjectileProfileId, getProjectileVisualProfile } from "../assets/projectileProfiles.js";

export const ORDINARY_PROJECTILE_PROFILE_IDS = Object.freeze(PROJECTILE_PROFILE_IDS.filter((id) => id !== "special"));
export const ORDINARY_PROJECTILE_DRAW_LIMIT = ORDINARY_PROJECTILE_PROFILE_IDS.length * 2;

export function createProjectilePool(scene, capacity = 48) {
  const entries = new Map(ORDINARY_PROJECTILE_PROFILE_IDS.map((id) => [id, createEntry(scene, id, capacity)]));

  return Object.freeze({
    sync(projectiles, y = 0.58) {
      entries.forEach((entry, id) => syncEntry(entry, projectiles, id, y));
    },
    spawn(id, position, speed = 9, thin = false) {
      const entry = entries.get(id) ?? entries.get("pistol");
      const slot = entry.items.find((item) => !item.active) ?? entry.items[0];
      Object.assign(slot, { active: true, age: 0, position: position.clone(), speed, thin });
    },
    update(dt) {
      entries.forEach((entry) => updateEntry(entry, dt));
    },
    clear() {
      entries.forEach((entry) => entry.items.forEach((item) => { item.active = false; }));
    },
    dispose() {
      entries.forEach((entry) => disposeEntry(scene, entry));
    },
  });
}

function createEntry(scene, id, capacity) {
  const profile = getProjectileVisualProfile({ owner: getOwner(id), weaponId: id });
  const coreGeometry = new THREE.CapsuleGeometry(profile.width, Math.max(0.02, profile.length - profile.width * 2), 4, 8);
  const trailGeometry = new THREE.ConeGeometry(profile.trailWidth, profile.trail, 8, 1, true);
  coreGeometry.rotateX(Math.PI / 2);
  trailGeometry.rotateX(-Math.PI / 2);
  trailGeometry.translate(0, 0, -profile.trail * 0.5 - profile.length * 0.35);
  const core = new THREE.InstancedMesh(coreGeometry, basicMaterial(1), capacity);
  const trail = new THREE.InstancedMesh(trailGeometry, basicMaterial(0.42), capacity);
  core.frustumCulled = false;
  trail.frustumCulled = false;
  scene.add(core, trail);
  return { core, trail, items: Array.from({ length: capacity }, () => ({ active: false })), matrix: new THREE.Matrix4(), position: new THREE.Vector3(), profile };
}

function updateEntry(entry, dt) {
  let visible = 0;
  entry.items.forEach((item) => {
    if (!item.active) return;
    item.age += dt;
    item.position.z += item.speed * dt;
    item.active = item.position.z < 34 && item.age < 4;
    if (!item.active) return;
    entry.position.copy(item.position);
    const widthScale = item.thin ? 0.32 : 1;
    entry.matrix.compose(entry.position, IDENTITY_ROTATION, new THREE.Vector3(widthScale, widthScale, 1));
    entry.core.setMatrixAt(visible, entry.matrix);
    entry.trail.setMatrixAt(visible, entry.matrix);
    entry.core.setColorAt(visible, TEMP_COLOR.set(entry.profile.color));
    entry.trail.setColorAt(visible, TEMP_COLOR.set(entry.profile.emissive));
    visible += 1;
  });
  entry.core.count = visible;
  entry.trail.count = visible;
  entry.core.instanceMatrix.needsUpdate = true;
  entry.trail.instanceMatrix.needsUpdate = true;
  markColorUpdates(entry);
}

function syncEntry(entry, projectiles, id, y) {
  const matching = projectiles.filter((projectile) => getProjectileProfileId(projectile) === id);
  const visible = Math.min(entry.items.length, matching.length);
  for (let index = 0; index < visible; index += 1) {
    const projectile = matching[index];
    entry.position.set(projectile.x, y, projectile.z);
    const widthScale = projectile.thin ? 0.32 : 1;
    entry.matrix.compose(entry.position, IDENTITY_ROTATION, TEMP_SCALE.set(widthScale, widthScale, 1));
    entry.core.setMatrixAt(index, entry.matrix);
    entry.trail.setMatrixAt(index, entry.matrix);
    entry.core.setColorAt(index, TEMP_COLOR.set(projectile.color ?? entry.profile.color));
    entry.trail.setColorAt(index, TEMP_COLOR.set(projectile.color ?? entry.profile.emissive));
  }
  entry.core.count = visible;
  entry.trail.count = visible;
  entry.core.instanceMatrix.needsUpdate = true;
  entry.trail.instanceMatrix.needsUpdate = true;
  markColorUpdates(entry);
}

function basicMaterial(opacity) {
  return new THREE.MeshBasicMaterial({ color: "#ffffff", depthWrite: opacity === 1, opacity, toneMapped: false, transparent: opacity < 1 });
}

function markColorUpdates(entry) {
  if (entry.core.instanceColor) entry.core.instanceColor.needsUpdate = true;
  if (entry.trail.instanceColor) entry.trail.instanceColor.needsUpdate = true;
}

function getOwner(id) {
  if (id === "soldier") return "soldier";
  if (id === "enemy") return "enemy";
  return "player";
}

function disposeEntry(scene, entry) {
  scene.remove(entry.core, entry.trail);
  entry.core.geometry.dispose();
  entry.trail.geometry.dispose();
  entry.core.material.dispose();
  entry.trail.material.dispose();
}

const IDENTITY_ROTATION = new THREE.Quaternion();
const TEMP_COLOR = new THREE.Color();
const TEMP_SCALE = new THREE.Vector3();
